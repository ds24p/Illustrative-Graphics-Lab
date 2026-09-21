struct Parameters {
  imageSize: vec2<u32>,
  levels: u32,
  matrixSize: u32,
}

const BAYER_2 = array<u32, 4>(
  0u, 2u,
  3u, 1u,
);

const BAYER_4 = array<u32, 16>(
  0u, 8u, 2u, 10u,
  12u, 4u, 14u, 6u,
  3u, 11u, 1u, 9u,
  15u, 7u, 13u, 5u,
);

const BAYER_8 = array<u32, 64>(
  0u, 32u, 8u, 40u, 2u, 34u, 10u, 42u,
  48u, 16u, 56u, 24u, 50u, 18u, 58u, 26u,
  12u, 44u, 4u, 36u, 14u, 46u, 6u, 38u,
  60u, 28u, 52u, 20u, 62u, 30u, 54u, 22u,
  3u, 35u, 11u, 43u, 1u, 33u, 9u, 41u,
  51u, 19u, 59u, 27u, 49u, 17u, 57u, 25u,
  15u, 47u, 7u, 39u, 13u, 45u, 5u, 37u,
  63u, 31u, 55u, 23u, 61u, 29u, 53u, 21u,
);

@group(0) @binding(0) var<storage, read> inputPixels: array<u32>;
@group(0) @binding(1) var<storage, read_write> outputPixels: array<u32>;
@group(0) @binding(2) var<uniform> parameters: Parameters;

fn bayerRank(x: u32, y: u32, size: u32) -> u32 {
  let index = (y % size) * size + (x % size);
  if (size == 2u) {
    return BAYER_2[index];
  }
  if (size == 4u) {
    return BAYER_4[index];
  }
  return BAYER_8[index];
}

fn orderedQuantizeChannel(
  channel: u32,
  maximumLevelIndex: u32,
  rank: u32,
  matrixSize: u32,
) -> u32 {
  let scaledNumerator = channel * maximumLevelIndex;
  let lowerLevel = scaledNumerator / 255u;
  let remainder = scaledNumerator % 255u;

  // remainder / 255 > (rank + 0.5) / matrixSize^2, compared exactly.
  let thresholdDenominator = 2u * matrixSize * matrixSize;
  let thresholdNumerator = 2u * rank + 1u;
  let chooseUpper =
    remainder * thresholdDenominator > 255u * thresholdNumerator;
  let levelIndex = min(
    lowerLevel + select(0u, 1u, chooseUpper),
    maximumLevelIndex,
  );
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
  let rank = bayerRank(x, y, parameters.matrixSize);
  let red = orderedQuantizeChannel(
    packedPixel & 0xffu,
    maximumLevelIndex,
    rank,
    parameters.matrixSize,
  );
  let green = orderedQuantizeChannel(
    (packedPixel >> 8u) & 0xffu,
    maximumLevelIndex,
    rank,
    parameters.matrixSize,
  );
  let blue = orderedQuantizeChannel(
    (packedPixel >> 16u) & 0xffu,
    maximumLevelIndex,
    rank,
    parameters.matrixSize,
  );
  let alpha = packedPixel & 0xff000000u;

  outputPixels[pixelIndex] = red | (green << 8u) | (blue << 16u) | alpha;
}
