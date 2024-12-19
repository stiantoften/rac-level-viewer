/**
 * Returns an InputHandler by attaching event handlers to the window and canvas.
 * @param {Window} window
 * @param {HTMLCanvasElement} canvas
 */
export function createInputHandler(window, canvas) {
  const digital = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  const analog = {
    x: 0,
    y: 0,
    zoom: 10,
  };
  let mouseDown = false;

  const setDigital = (
    /** @type {KeyboardEvent} */ e,
    /** @type {boolean} */ value
  ) => {
    switch (e.code) {
      case "KeyW":
        digital.forward = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "KeyS":
        digital.backward = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "KeyA":
        digital.left = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "KeyD":
        digital.right = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "KeyE":
        digital.up = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "KeyQ":
        digital.down = value;
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  };

  window.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) =>
    setDigital(e, true)
  );
  window.addEventListener("keyup", (/** @type {KeyboardEvent} */ e) =>
    setDigital(e, false)
  );

  canvas.style.touchAction = "pinch-zoom";
  canvas.addEventListener("pointerdown", () => {
    mouseDown = true;
  });
  canvas.addEventListener("pointerup", () => {
    mouseDown = false;
  });
  canvas.addEventListener("pointermove", (/** @type {PointerEvent} */ e) => {
    mouseDown = e.pointerType == "mouse" ? (e.buttons & 1) !== 0 : true;
    if (mouseDown) {
      analog.x += e.movementX;
      analog.y += e.movementY;
    }
  });
  canvas.addEventListener(
    "wheel",
    (/** @type {WheelEvent} */ e) => {
      // The scroll value varies substantially between user agents / browsers.
      // Just use the sign.
      if (analog.zoom > 0) {
        analog.zoom -= Math.sign(e.deltaY);
      } else {
        analog.zoom = 1;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    { passive: false }
  );

  return () => {
    const out = {
      digital,
      analog: {
        x: analog.x,
        y: analog.y,
        zoom: analog.zoom,
        touching: mouseDown,
      },
    };
    // Clear the analog values, as these accumulate.
    analog.x = 0;
    analog.y = 0;
    // analog.zoom = 0;
    return out;
  };
}
