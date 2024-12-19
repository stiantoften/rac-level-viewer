struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) fragUV : vec2f,
}

@vertex
fn main(
    @location(0) position : vec3f, 
    @location(1) uv : vec2f, 
    @location(2) mat_1 : vec4f,
    @location(3) mat_2 : vec4f,
    @location(4) mat_3 : vec4f,
    @location(5) mat_4 : vec4f,
  ) -> VertexOutput {
  var output : VertexOutput;
  output.position = uniforms.modelViewProjectionMatrix * mat4x4(mat_1,mat_2,mat_3,mat_4) * vec4(position, 1.0);
  output.fragUV = uv;
  return output;
}
