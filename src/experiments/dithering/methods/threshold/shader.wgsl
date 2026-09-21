struct Parameters {
  imageSize: vec2<u32>,
  threshold: f32,
  _padding: u32,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  // The global invocation coordinates identify one image pixel.
  let x = invocation.x;
  let y = invocation.y;

  // Dispatch dimensions are rounded up to whole workgroups, so extra
  // invocations must not read or write outside the image buffers.
  if (x >= parameters.imageSize.x || y >= parameters.imageSize.y) {
    return;
  }

  let pixelIndex = y * parameters.imageSize.x + x;

  // Each input u32 stores one little-endian RGBA8 pixel.
  let packedPixel = inputPixels[pixelIndex];
  let red = packedPixel & 0xffu;
  let green = (packedPixel >> 8u) & 0xffu;
  let blue = (packedPixel >> 16u) & 0xffu;

  // Processing brightness() is the HSV value component: max(R, G, B) / 255.
  let brightness = f32(max(max(red, green), blue)) / 255.0;

  // Match the CPU reference exactly: values equal to the threshold are white.
  let binaryValue = select(0u, 255u, brightness >= parameters.threshold);

  // Write an opaque grayscale RGBA8 pixel into the output storage buffer.
  outputPixels[pixelIndex] =
    binaryValue |
    (binaryValue << 8u) |
    (binaryValue << 16u) |
    0xff000000u;
}
