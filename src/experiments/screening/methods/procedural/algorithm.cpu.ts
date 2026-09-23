import type {
  IntensityImage,
  ProceduralKernel,
  ProceduralScreeningOptions,
  ProceduralScreeningResult,
  ScalarField,
} from "../../types";
import {
  displaceSine,
  mapModulo,
  rotateAroundImageCenter,
} from "./coordinates";

const RAW_KERNEL_PREVIEW_SIZE = 256;

function validateInput(
  source: IntensityImage,
  options: ProceduralScreeningOptions,
) {
  if (
    source.width < 1 ||
    source.height < 1 ||
    source.values.length !== source.width * source.height
  ) {
    throw new Error("The source intensity image is invalid.");
  }

  if (options.cellWidth < 1 || options.cellHeight < 1) {
    throw new Error("Procedural cell dimensions must be at least 1 pixel.");
  }

  const numericValues = [
    options.angleRadians,
    options.sine.amplitude,
    options.sine.frequency,
    options.sine.phaseRadians,
    options.kernelParameters.I,
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    throw new Error("Procedural screening parameters must be finite numbers.");
  }

  if (options.kernelParameters.I < 0 || options.kernelParameters.I > 1) {
    throw new Error("Cross parameter I must be between 0 and 1.");
  }
}

function sampleRawKernel(
  kernel: ProceduralKernel,
  options: ProceduralScreeningOptions,
): ScalarField {
  const values = new Float32Array(
    RAW_KERNEL_PREVIEW_SIZE * RAW_KERNEL_PREVIEW_SIZE,
  );

  for (let y = 0; y < RAW_KERNEL_PREVIEW_SIZE; y += 1) {
    const t = y / RAW_KERNEL_PREVIEW_SIZE;
    for (let x = 0; x < RAW_KERNEL_PREVIEW_SIZE; x += 1) {
      const s = x / RAW_KERNEL_PREVIEW_SIZE;
      values[y * RAW_KERNEL_PREVIEW_SIZE + x] = kernel(
        s,
        t,
        options.kernelParameters,
      );
    }
  }

  return {
    width: RAW_KERNEL_PREVIEW_SIZE,
    height: RAW_KERNEL_PREVIEW_SIZE,
    values,
  };
}

export function screenProcedurally(
  source: IntensityImage,
  options: ProceduralScreeningOptions,
  kernel: ProceduralKernel,
  debugEnabled = false,
): ProceduralScreeningResult {
  validateInput(source, options);

  const output = new Uint8Array(source.values.length);
  const moduloMappedKernel = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const thresholdBeforeSine =
    debugEnabled && options.sine.enabled
      ? new Float32Array(source.values.length)
      : undefined;
  const thresholdField = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = y * source.width + x;

      if (moduloMappedKernel) {
        const unrotatedPoint = mapModulo(
          { x, y },
          options.cellWidth,
          options.cellHeight,
        );
        moduloMappedKernel[index] = kernel(
          unrotatedPoint.s,
          unrotatedPoint.t,
          options.kernelParameters,
        );
      }

      const rotated = rotateAroundImageCenter(
        x,
        y,
        source.width,
        source.height,
        options.angleRadians,
      );
      const mapped = mapModulo(
        rotated,
        options.cellWidth,
        options.cellHeight,
      );

      if (thresholdBeforeSine) {
        thresholdBeforeSine[index] = kernel(
          mapped.s,
          mapped.t,
          options.kernelParameters,
        );
      }

      const proceduralPoint = options.sine.enabled
        ? displaceSine(
            mapped,
            options.sine.amplitude,
            options.sine.frequency,
            options.sine.phaseRadians,
          )
        : mapped;
      const threshold = kernel(
        proceduralPoint.s,
        proceduralPoint.t,
        options.kernelParameters,
      );

      // Procedural screening uses K directly; unlike image kernels, it is not inverted.
      output[index] = source.values[index] < threshold ? 0 : 1;
      if (thresholdField) thresholdField[index] = threshold;
    }
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    debug:
      moduloMappedKernel && thresholdField
        ? {
            rawKernel: sampleRawKernel(kernel, options),
            moduloMappedKernel,
            thresholdBeforeSine,
            thresholdField,
          }
        : undefined,
  };
}
