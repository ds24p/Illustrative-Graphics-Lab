struct Parameters {
  imageSize: vec2<u32>,
  kernelSize: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;
@group(0) @binding(3) var<storage, read> kernelValues: array<f32>;

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
  let sourceByte = max(max(red, green), blue);

  let kernelX = x % parameters.kernelSize.x;
  let kernelY = y % parameters.kernelSize.y;
  let kernelIndex = kernelY * parameters.kernelSize.x + kernelX;
  let kernelByte = u32(round(clamp(kernelValues[kernelIndex], 0.0, 1.0) * 255.0));

  // For RGBA8-derived source and kernel values this integer comparison is
  // exactly equivalent to sourceIntensity < 1 - K. Equality remains white.
  let binaryValue = select(255u, 0u, sourceByte + kernelByte < 255u);
  outputPixels[pixelIndex] =
    binaryValue |
    (binaryValue << 8u) |
    (binaryValue << 16u) |
    0xff000000u;
}
