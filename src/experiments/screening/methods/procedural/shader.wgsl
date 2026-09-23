struct Parameters {
  imageSize: vec2<u32>,
  cellSize: vec2<u32>,
  angleRadians: f32,
  sineAmplitude: f32,
  sineFrequency: f32,
  sinePhaseRadians: f32,
  crossI: f32,
  sineEnabled: u32,
  kernelKind: u32,
  _padding: u32,
}

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

fn positiveModulo(value: f32, modulus: f32) -> f32 {
  let remainder = value % modulus;
  if (remainder == 0.0) {
    return 0.0;
  }
  return select(remainder, remainder + modulus, remainder < 0.0);
}

fn rotateAroundImageCenter(x: f32, y: f32) -> vec2<f32> {
  let center = vec2<f32>(parameters.imageSize) / 2.0;
  let translated = vec2<f32>(x, y) - center;
  let cosine = cos(parameters.angleRadians);
  let sine = sin(parameters.angleRadians);
  return vec2<f32>(
    translated.x * cosine - translated.y * sine,
    translated.x * sine + translated.y * cosine,
  ) + center;
}

fn mapModulo(position: vec2<f32>) -> vec2<f32> {
  let cellSize = vec2<f32>(parameters.cellSize);
  return vec2<f32>(
    positiveModulo(position.x, cellSize.x) / cellSize.x,
    positiveModulo(position.y, cellSize.y) / cellSize.y,
  );
}

fn mapUnrotated(x: u32, y: u32) -> vec2<f32> {
  return vec2<f32>(
    f32(x % parameters.cellSize.x) / f32(parameters.cellSize.x),
    f32(y % parameters.cellSize.y) / f32(parameters.cellSize.y),
  );
}

fn applySineDisplacement(point: vec2<f32>) -> vec2<f32> {
  if (parameters.sineEnabled == 0u) {
    return point;
  }

  let displacement = parameters.sineAmplitude * sin(
    parameters.sineFrequency * 2.0 * 3.141592653589793 * point.y +
    parameters.sinePhaseRadians,
  );
  return vec2<f32>(positiveModulo(point.x + displacement, 1.0), point.y);
}

fn doubleSidedRamp(s: f32) -> f32 {
  if (s <= 0.5) {
    return 2.0 * s;
  }
  return 2.0 - 2.0 * s;
}

fn crossKernel(s: f32, t: f32) -> f32 {
  if (s <= parameters.crossI) {
    return parameters.crossI * t;
  }
  return (1.0 - parameters.crossI) * s + parameters.crossI;
}

fn evaluateKernel(point: vec2<f32>) -> f32 {
  if (parameters.kernelKind == 0u) {
    return doubleSidedRamp(point.x);
  }
  return crossKernel(point.x, point.y);
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
  let sourceIntensity = f32(max(max(red, green), blue)) / 255.0;

  var mapped: vec2<f32>;
  if (parameters.angleRadians == 0.0) {
    mapped = mapUnrotated(x, y);
  } else {
    let rotated = rotateAroundImageCenter(f32(x), f32(y));
    mapped = mapModulo(rotated);
  }
  let proceduralPoint = applySineDisplacement(mapped);
  let threshold = evaluateKernel(proceduralPoint);
  let binaryValue = select(255u, 0u, sourceIntensity < threshold);

  outputPixels[pixelIndex] =
    binaryValue |
    (binaryValue << 8u) |
    (binaryValue << 16u) |
    0xff000000u;
}
