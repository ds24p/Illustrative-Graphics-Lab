import type { RasterResult } from "../../../../core/results/types";
import type { TemplateParameters } from "../../types";

function quantize(value: number, levels: number) {
  const steps = Math.max(1, levels - 1);
  return Math.round((value / 255) * steps) * (255 / steps);
}

export function runPosterize(
  source: ImageData,
  parameters: TemplateParameters,
): RasterResult {
  const output = new Uint8ClampedArray(source.data.length);

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const correctedGray = 255 * (luminance / 255) ** parameters.gamma;
    const bias = parameters.channelBias * 24;
    const target = parameters.colorMode === "color"
      ? [
          quantize(red + bias, parameters.levels),
          quantize(green, parameters.levels),
          quantize(blue - bias, parameters.levels),
        ]
      : Array(3).fill(quantize(correctedGray, parameters.levels));

    output[index] = red + (target[0] - red) * parameters.intensity;
    output[index + 1] = green + (target[1] - green) * parameters.intensity;
    output[index + 2] = blue + (target[2] - blue) * parameters.intensity;
    output[index + 3] = parameters.preserveAlpha
      ? source.data[index + 3]
      : 255;
  }

  return {
    kind: "raster",
    imageData: new ImageData(output, source.width, source.height),
  };
}
