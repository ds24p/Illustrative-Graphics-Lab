struct Parameters {
  imageSize: vec2<u32>,
  levels: u32,
  _padding: u32,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

fn quantizeChannel(channel: u32, maximumLevelIndex: u32) -> u32 {
  // Exact RGBA8 form of round((channel / 255) * maximumLevelIndex).
  let levelIndex = (channel * maximumLevelIndex + 127u) / 255u;
  // Convert the selected level back to RGBA8 with JavaScript-style half-up rounding.
  return (levelIndex * 255u + maximumLevelIndex / 2u) / maximumLevelIndex;
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
  let maximumLevelIndex = max(parameters.levels, 2u) - 1u;
  let red = quantizeChannel(packedPixel & 0xffu, maximumLevelIndex);
  let green = quantizeChannel((packedPixel >> 8u) & 0xffu, maximumLevelIndex);
  let blue = quantizeChannel((packedPixel >> 16u) & 0xffu, maximumLevelIndex);
  let alpha = packedPixel & 0xff000000u;

  outputPixels[pixelIndex] = red | (green << 8u) | (blue << 16u) | alpha;
}
