struct Parameters {
  imageSize: vec2<u32>,
  baseThreshold: f32,
  randomAmplitude: f32,
  seed: u32,
  _padding: u32,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

fn hashPixelCoordinates(x: u32, y: u32, seed: u32) -> u32 {
  var value = (x * 0x1f123bb5u) ^ (y * 0x5f356495u) ^ seed;
  value = value ^ (value >> 16u);
  value = value * 0x7feb352du;
  value = value ^ (value >> 15u);
  value = value * 0x846ca68bu;
  return value ^ (value >> 16u);
}

fn coordinateRandom(x: u32, y: u32, seed: u32) -> f32 {
  // Keep the upper 24 bits so conversion to f32 is exact.
  let randomBits = hashPixelCoordinates(x, y, seed) >> 8u;
  return f32(randomBits) / 16777216.0;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  let x = invocation.x;
  let y = invocation.y;
  if (x >= parameters.imageSize.x || y >= parameters.imageSize.y) {
    return;
  }

  let pixelIndex = y * parameters.imageSize.x + x;
  let packedPixel = inputPixels[pixelIndex];
  let red = packedPixel & 0xffu;
  let green = (packedPixel >> 8u) & 0xffu;
  let blue = (packedPixel >> 16u) & 0xffu;
  let brightness = f32(max(max(red, green), blue)) / 255.0;

  let randomValue = coordinateRandom(x, y, parameters.seed);
  let centeredRandom = randomValue * 2.0 - 1.0;
  let randomOffset = centeredRandom * parameters.randomAmplitude;
  let randomizedThreshold = parameters.baseThreshold + randomOffset;
  let binaryValue = select(0u, 255u, brightness >= randomizedThreshold);

  outputPixels[pixelIndex] =
    binaryValue |
    (binaryValue << 8u) |
    (binaryValue << 16u) |
    0xff000000u;
}
