import type { ExperimentBackend } from "../../core/backends/types";
import { convertToGrayscale, createTonalBands } from "./algorithm.cpu";
import type { GrayscaleMethod, GrayscaleParameters } from "./types";

export function createGrayscaleCpuBackend(
  method: GrayscaleMethod,
): ExperimentBackend<GrayscaleParameters> {
  return {
    id: "cpu",
    async run({ source, parameters, debugEnabled }) {
      const output = convertToGrayscale(source.imageData, method, parameters);

      return {
        output,
        debugViews: debugEnabled
          ? [
              {
                id: "tonal-bands",
                label: "Five-band luminance map",
                result: createTonalBands(output.imageData),
              },
            ]
          : undefined,
      };
    },
  };
}
