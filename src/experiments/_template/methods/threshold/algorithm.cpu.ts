import type { ExperimentOutput } from "../../../../core/results/types";
import type { TemplateParameters } from "../../types";

function parseHexColor(color: string) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

export function runThreshold(
  source: ImageData,
  parameters: TemplateParameters,
  debugEnabled: boolean,
): ExperimentOutput {
  const output = new Uint8ClampedArray(source.data.length);
  const luminanceMap = debugEnabled
    ? new Uint8ClampedArray(source.data.length)
    : undefined;
  const thresholdMask = debugEnabled
    ? new Uint8ClampedArray(source.data.length)
    : undefined;
  const ink = parseHexColor(parameters.inkColor);

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const corrected = 255 * (luminance / 255) ** parameters.gamma;
    const isInk = (corrected < parameters.threshold) !== parameters.invert;
    const maskValue = corrected < parameters.threshold ? 0 : 255;

    const target = parameters.colorMode === "color"
      ? [
          red < parameters.threshold ? 0 : 255,
          green < parameters.threshold ? 0 : 255,
          blue < parameters.threshold ? 0 : 255,
        ]
      : isInk
        ? ink
        : [255, 255, 255];

    output[index] = red + (target[0] - red) * parameters.intensity;
    output[index + 1] = green + (target[1] - green) * parameters.intensity;
    output[index + 2] = blue + (target[2] - blue) * parameters.intensity;
    output[index + 3] = parameters.preserveAlpha
      ? source.data[index + 3]
      : 255;

    if (luminanceMap && thresholdMask) {
      luminanceMap[index] = luminance;
      luminanceMap[index + 1] = luminance;
      luminanceMap[index + 2] = luminance;
      luminanceMap[index + 3] = source.data[index + 3];
      thresholdMask[index] = maskValue;
      thresholdMask[index + 1] = maskValue;
      thresholdMask[index + 2] = maskValue;
      thresholdMask[index + 3] = source.data[index + 3];
    }
  }

  return {
    output: {
      kind: "raster",
      imageData: new ImageData(output, source.width, source.height),
    },
    debugViews:
      luminanceMap && thresholdMask
        ? [
            {
              id: "luminance-map",
              label: "Luminance map",
              result: {
                kind: "raster",
                imageData: new ImageData(
                  luminanceMap,
                  source.width,
                  source.height,
                ),
              },
            },
            {
              id: "threshold-mask",
              label: "Threshold mask",
              result: {
                kind: "raster",
                imageData: new ImageData(
                  thresholdMask,
                  source.width,
                  source.height,
                ),
              },
            },
          ]
        : undefined,
  };
}
