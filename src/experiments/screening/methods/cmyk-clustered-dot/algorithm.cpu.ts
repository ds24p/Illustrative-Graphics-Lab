import { compositeChannelOverWhite } from "../../../../core/images/pixels";
import { createImageCenterRotation } from "../../coordinates";
import { combineIdealCmykMasks, rgbToCmyk } from "./color";
import {
  coverageToInk,
  createClusteredDotThresholdCell,
  sampleRotatedThreshold,
} from "./threshold";
import type {
  CmykDebugData,
  CmykScreeningOptions,
  CmykScreeningResult,
  CmykScreenSamplers,
} from "./types";

function validateSource(source: ImageData) {
  if (
    source.width < 1 ||
    source.height < 1 ||
    source.data.length !== source.width * source.height * 4
  ) {
    throw new Error("The source image is invalid.");
  }
}

function createDebugData(pixelCount: number): CmykDebugData {
  return {
    coverages: {
      cyan: new Float32Array(pixelCount),
      magenta: new Float32Array(pixelCount),
      yellow: new Float32Array(pixelCount),
      black: new Float32Array(pixelCount),
    },
    thresholds: {
      cyan: new Float32Array(pixelCount),
      magenta: new Float32Array(pixelCount),
      yellow: new Float32Array(pixelCount),
      black: new Float32Array(pixelCount),
    },
    masks: {
      cyan: new Uint8Array(pixelCount),
      magenta: new Uint8Array(pixelCount),
      yellow: new Uint8Array(pixelCount),
      black: new Uint8Array(pixelCount),
    },
  };
}

function createSamplers(
  width: number,
  height: number,
  options: CmykScreeningOptions,
): CmykScreenSamplers {
  return {
    cyan: createImageCenterRotation(width, height, options.angleRadians.cyan),
    magenta: createImageCenterRotation(
      width,
      height,
      options.angleRadians.magenta,
    ),
    yellow: createImageCenterRotation(
      width,
      height,
      options.angleRadians.yellow,
    ),
    black: createImageCenterRotation(width, height, options.angleRadians.black),
  };
}

export function screenCmykClusteredDot(
  source: ImageData,
  options: CmykScreeningOptions,
  debugEnabled = false,
): CmykScreeningResult {
  validateSource(source);

  const pixelCount = source.width * source.height;
  const output = new Uint8ClampedArray(pixelCount * 4);
  const cell = createClusteredDotThresholdCell(options.cellSize);
  const samplers = createSamplers(source.width, source.height, options);
  const debug = debugEnabled ? createDebugData(pixelCount) : undefined;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = y * source.width + x;
      const pixel = index * 4;
      const cmyk = rgbToCmyk(
        compositeChannelOverWhite(source.data, index, 0) / 255,
        compositeChannelOverWhite(source.data, index, 1) / 255,
        compositeChannelOverWhite(source.data, index, 2) / 255,
      );

      const cyanThreshold = sampleRotatedThreshold(
        cell,
        x,
        y,
        samplers.cyan,
      );
      const magentaThreshold = sampleRotatedThreshold(
        cell,
        x,
        y,
        samplers.magenta,
      );
      const yellowThreshold = sampleRotatedThreshold(
        cell,
        x,
        y,
        samplers.yellow,
      );
      const blackThreshold = sampleRotatedThreshold(
        cell,
        x,
        y,
        samplers.black,
      );

      const cyanInk = coverageToInk(cmyk.cyan, cyanThreshold);
      const magentaInk = coverageToInk(cmyk.magenta, magentaThreshold);
      const yellowInk = coverageToInk(cmyk.yellow, yellowThreshold);
      const blackInk = coverageToInk(cmyk.black, blackThreshold);
      const rgb = combineIdealCmykMasks(
        cyanInk,
        magentaInk,
        yellowInk,
        blackInk,
      );

      output[pixel] = Math.round(rgb.red * 255);
      output[pixel + 1] = Math.round(rgb.green * 255);
      output[pixel + 2] = Math.round(rgb.blue * 255);
      output[pixel + 3] = 255;

      if (debug) {
        debug.coverages.cyan[index] = cmyk.cyan;
        debug.coverages.magenta[index] = cmyk.magenta;
        debug.coverages.yellow[index] = cmyk.yellow;
        debug.coverages.black[index] = cmyk.black;
        debug.thresholds.cyan[index] = cyanThreshold;
        debug.thresholds.magenta[index] = magentaThreshold;
        debug.thresholds.yellow[index] = yellowThreshold;
        debug.thresholds.black[index] = blackThreshold;
        debug.masks.cyan[index] = cyanInk;
        debug.masks.magenta[index] = magentaInk;
        debug.masks.yellow[index] = yellowInk;
        debug.masks.black[index] = blackInk;
      }
    }
  }

  return {
    image: { width: source.width, height: source.height, data: output },
    debug,
  };
}
