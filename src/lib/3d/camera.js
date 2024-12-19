import { mat4, vec3 } from "wgpu-matrix";

// WASDCamera is a camera implementation that behaves similar to first-person-shooter PC games.
export class Camera {
  // The camera absolute pitch angle
  pitch = Math.PI / 2;
  // The camera absolute yaw angle
  yaw = 0;

  // The movement veloicty
  velocity_ = vec3.create();

  // Speed multiplier for camera movement
  movementSpeed = 10;

  // Speed multiplier for camera rotation
  rotationSpeed = 0.5;

  // Movement velocity drag coeffient [0 .. 1]
  // 0: Continues forever
  // 1: Instantly stops moving
  frictionCoefficient = 0.98;

  matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  right = new Float32Array(this.matrix.buffer, 4 * 0, 4);
  up = new Float32Array(this.matrix.buffer, 4 * 4, 4);
  back = new Float32Array(this.matrix.buffer, 4 * 8, 4);
  position = new Float32Array(this.matrix.buffer, 4 * 12, 4);

  // Returns velocity vector
  get velocity() {
    return this.velocity_;
  }
  // Assigns `vec` to the velocity vector
  set velocity(vec) {
    vec3.copy(vec, this.velocity_);
  }

  /** @param {{ position?: Float32Array; target?: Float32Array; }} options */
  constructor(options) {
    if (options && (options.position || options.target)) {
      const position = options.position ?? vec3.create(0, 0, 0);
      const target = options.target ?? vec3.create(0, 0, 0);
      const back = vec3.normalize(vec3.sub(position, target));
      this.recalculateAngles(back);
      vec3.copy(position, this.position);
    }
  }

  /**
   * @param {number} deltaTime
   * @param {{ digital: any; analog: any; }} input
   */
  update(deltaTime, input) {
    this.yaw = mod(
      this.yaw - input.analog.x * deltaTime * this.rotationSpeed,
      Math.PI * 2
    );
    this.pitch = clamp(
      this.pitch - input.analog.y * deltaTime * this.rotationSpeed,
      0,
      Math.PI
    );

    const position = vec3.copy(this.position);

    mat4.copy(mat4.rotateX(mat4.rotationZ(this.yaw), this.pitch), this.matrix);

    // Calculate the new target velocity
    const digital = input.digital;
    const deltaRight = sign(digital.right, digital.left);
    const deltaUp = sign(digital.up, digital.down);
    const targetVelocity = vec3.create();
    const deltaBack = sign(digital.backward, digital.forward);
    vec3.addScaled(targetVelocity, this.right, deltaRight, targetVelocity);
    vec3.addScaled(targetVelocity, this.up, deltaUp, targetVelocity);
    vec3.addScaled(targetVelocity, this.back, deltaBack, targetVelocity);
    vec3.normalize(targetVelocity, targetVelocity);

    vec3.mulScalar(targetVelocity, input.analog.zoom, targetVelocity);

    // Mix new target velocity
    this.velocity = lerp(
      targetVelocity,
      this.velocity,
      Math.pow(1 - this.frictionCoefficient, deltaTime)
    );

    // Integrate velocity to calculate new position
    vec3.copy(
      vec3.addScaled(position, this.velocity, deltaTime),
      this.position
    );

    return mat4.invert(this.matrix);
  }

  /**
   * Recalculates the yaw and pitch values from a directional vector
   * @param {Float32Array} dir
   */
  recalculateAngles(dir) {
    // this.yaw = Math.atan2(dir[0], dir[2]);
    // this.pitch = -Math.asin(dir[1]);
  }
}

const sign = (/** @type {any} */ positive, /** @type {any} */ negative) =>
  (positive ? 1 : 0) - (negative ? 1 : 0);

/**
 * Returns `x` clamped between [`min` .. `max`]
 * @param {number} x
 * @param {number} min
 * @param {number} max
 */
function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

/**
 * Returns `x` float-modulo `div`
 * @param {number} x
 * @param {number} div
 */
function mod(x, div) {
  return x - Math.floor(Math.abs(x) / div) * div * Math.sign(x);
}

/**
 * Returns `vec` rotated `angle` radians around `axis`
 * @param {import("wgpu-matrix").BaseArgType} vec
 * @param {import("wgpu-matrix").BaseArgType} axis
 * @param {number} angle
 */
function rotate(vec, axis, angle) {
  return vec3.transformMat4Upper3x3(vec, mat4.rotation(axis, angle));
}

/**
 * Returns the linear interpolation between 'a' and 'b' using 's'
 * @param {import("wgpu-matrix").BaseArgType} a
 * @param {import("wgpu-matrix").BaseArgType} b
 * @param {number} s
 */
function lerp(a, b, s) {
  return vec3.addScaled(a, vec3.sub(b, a), s);
}
