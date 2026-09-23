struct Parameters {
  imageSize: vec2<u32>,
  cellSize: u32,
  _padding: u32,
  angleRadians: vec4<f32>,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;
@group(0) @binding(3) var<storage, read> thresholdCell: array<f32>;

fn positiveModulo(value: f32, modulus: f32) -> f32 {
  let remainder = value % modulus;
  if (remainder == 0.0) {
    return 0.0;
  }
  return select(remainder, remainder + modulus, remainder < 0.0);
}

fn thresholdAt(x: u32, y: u32, angle: f32) -> f32 {
  let size = parameters.cellSize;
  var cellX: u32;
  var cellY: u32;

  // floor(mod(x + 0.5, N)) == x % N for nonnegative integer x.
  if (angle == 0.0) {
    cellX = x % size;
    cellY = y % size;
  } else {
    let center = vec2<f32>(parameters.imageSize) / 2.0;
    let pixelCenter = vec2<f32>(f32(x) + 0.5, f32(y) + 0.5);
    let translated = pixelCenter - center;
    let cosine = cos(angle);
    let sine = sin(angle);
    let rotated = vec2<f32>(
      translated.x * cosine - translated.y * sine,
      translated.x * sine + translated.y * cosine,
    ) + center;
    let cellSize = f32(size);
    cellX = u32(floor(positiveModulo(rotated.x, cellSize)));
    cellY = u32(floor(positiveModulo(rotated.y, cellSize)));
  }

  return thresholdCell[cellY * size + cellX];
}

fn rgbToCmyk(rgb: vec3<f32>) -> vec4<f32> {
  let normalized = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));
  let black = 1.0 - max(max(normalized.r, normalized.g), normalized.b);
  if (black >= 1.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }
  let remaining = 1.0 - black;
  return vec4<f32>(
    clamp((1.0 - normalized.r - black) / remaining, 0.0, 1.0),
    clamp((1.0 - normalized.g - black) / remaining, 0.0, 1.0),
    clamp((1.0 - normalized.b - black) / remaining, 0.0, 1.0),
    clamp(black, 0.0, 1.0),
  );
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  let x = invocation.x;
  let y = invocation.y;
  if (x >= parameters.imageSize.x || y >= parameters.imageSize.y) {
    return;
  }

  let pixelIndex = y * parameters.imageSize.x + x;
  let packed = inputPixels[pixelIndex];
  let alpha = f32((packed >> 24u) & 0xffu) / 255.0;
  let rgb = vec3<f32>(
    f32(packed & 0xffu) / 255.0,
    f32((packed >> 8u) & 0xffu) / 255.0,
    f32((packed >> 16u) & 0xffu) / 255.0,
  );
  let cmyk = rgbToCmyk(rgb * alpha + vec3<f32>(1.0 - alpha));

  let cInk = select(0u, 1u, cmyk.x >= thresholdAt(x, y, parameters.angleRadians.x));
  let mInk = select(0u, 1u, cmyk.y >= thresholdAt(x, y, parameters.angleRadians.y));
  let yInk = select(0u, 1u, cmyk.z >= thresholdAt(x, y, parameters.angleRadians.z));
  let kInk = select(0u, 1u, cmyk.w >= thresholdAt(x, y, parameters.angleRadians.w));

  let red = 255u * (1u - cInk) * (1u - kInk);
  let green = 255u * (1u - mInk) * (1u - kInk);
  let blue = 255u * (1u - yInk) * (1u - kInk);
  outputPixels[pixelIndex] = red | (green << 8u) | (blue << 16u) | 0xff000000u;
}
