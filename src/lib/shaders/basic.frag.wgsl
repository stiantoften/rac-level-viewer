@group(0) @binding(1) var mySampler: sampler;
@group(1) @binding(0) var myTexture: texture_2d<f32>;

@fragment
fn main(@location(0) fragUV: vec2f) -> @location(0) vec4f {
  return textureSample(myTexture, mySampler, fragUV) ;
}
