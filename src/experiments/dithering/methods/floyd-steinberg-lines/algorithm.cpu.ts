import type {
  BackwardLine,
  DitheringCoreResult,
  IntensityImage,
} from "../../types";

export function createBackwardLine(
  x: number,
  y: number,
  length: number,
): BackwardLine {
  return { x, y, length };
}

export function rasterizeBackwardLine(
  line: BackwardLine,
  target: Uint8Array,
  width: number,
  height: number,
  coverage?: Uint16Array,
) {
  for (let offset = 0; offset < line.length; offset += 1) {
    const currentX = line.x - offset;
    const currentY = line.y - offset;
    if (
      currentX >= 0 &&
      currentY >= 0 &&
      currentX < width &&
      currentY < height
    ) {
      const index = currentX + currentY * width;
      target[index] = 0;
      if (coverage) coverage[index] += 1;
    }
  }
}

export function ditherFloydSteinbergLines(
  source: IntensityImage,
  lineLength: number,
  debugEnabled: boolean,
): DitheringCoreResult {
  const working = new Float32Array(source.values);
  const output = new Uint8Array(source.values.length);
  output.fill(1);
  const adjustedIntensity = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const incomingError = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const lineSeeds = debugEnabled
    ? new Uint8Array(source.values.length)
    : undefined;
  const lineCoverage = debugEnabled
    ? new Uint16Array(source.values.length)
    : undefined;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = x + y * source.width;
      const adjusted = working[index];
      const quantized = adjusted >= 0.5 ? 1 : 0;

      if (adjustedIntensity && incomingError) {
        adjustedIntensity[index] = adjusted;
        incomingError[index] = adjusted - source.values[index];
      }

      let error: number;
      if (quantized === 0) {
        if (lineSeeds) lineSeeds[index] = 1;
        const line = createBackwardLine(x, y, lineLength);
        rasterizeBackwardLine(
          line,
          output,
          source.width,
          source.height,
          lineCoverage,
        );

        // Preserve the sketch: compensation assumes the full line length even
        // at clipped boundaries and when pixels were already black from overlap.
        error = adjusted + (lineLength - 1);
      } else {
        // Preserve source[x][y] - output[x][y] from the Processing sketch.
        error = adjusted - output[index];
      }

      if (x + 1 < source.width) working[index + 1] += (7 / 16) * error;
      if (x > 0 && y + 1 < source.height) {
        working[index + source.width - 1] += (3 / 16) * error;
      }
      if (y + 1 < source.height) {
        working[index + source.width] += (5 / 16) * error;
      }
      if (x + 1 < source.width && y + 1 < source.height) {
        working[index + source.width + 1] += (1 / 16) * error;
      }
    }
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    debug: debugEnabled
      ? { adjustedIntensity, incomingError, lineSeeds, lineCoverage }
      : undefined,
  };
}
