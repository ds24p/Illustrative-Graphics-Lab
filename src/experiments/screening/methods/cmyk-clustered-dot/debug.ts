import type { DebugView, RasterResult } from "../../../../core/results/types";
import { imageDataToRaster, scalarImageToRaster } from "../../debug";
import type {
  CmykChannel,
  CmykDebugData,
  RgbaImage,
} from "./types";

const inkColors: Record<CmykChannel, readonly [number, number, number]> = {
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  yellow: [255, 255, 0],
  black: [0, 0, 0],
};

const channelLabels: Record<CmykChannel, string> = {
  cyan: "Cyan",
  magenta: "Magenta",
  yellow: "Yellow",
  black: "Black",
};

function rgbaImageToRaster(image: RgbaImage): RasterResult {
  return {
    kind: "raster",
    imageData: new ImageData(
      new Uint8ClampedArray(image.data),
      image.width,
      image.height,
    ),
  };
}

function inkValuesToRaster(
  values: Float32Array | Uint8Array,
  width: number,
  height: number,
  channel: CmykChannel,
): RasterResult {
  const pixels = new Uint8ClampedArray(values.length * 4);
  const ink = inkColors[channel];

  for (let index = 0; index < values.length; index += 1) {
    const amount = Math.max(0, Math.min(1, values[index]));
    const pixel = index * 4;
    pixels[pixel] = Math.round(255 + (ink[0] - 255) * amount);
    pixels[pixel + 1] = Math.round(255 + (ink[1] - 255) * amount);
    pixels[pixel + 2] = Math.round(255 + (ink[2] - 255) * amount);
    pixels[pixel + 3] = 255;
  }

  return { kind: "raster", imageData: new ImageData(pixels, width, height) };
}

export function cmykImageToRaster(image: RgbaImage): RasterResult {
  return rgbaImageToRaster(image);
}

export function createCmykDebugViews(
  source: ImageData,
  debug: CmykDebugData,
  output: RasterResult,
): DebugView[] {
  const dimensions = [source.width, source.height] as const;
  const channels: CmykChannel[] = ["cyan", "magenta", "yellow", "black"];

  return [
    {
      id: "original",
      label: "Original",
      group: "Source",
      result: imageDataToRaster(source),
    },
    ...channels.map((channel): DebugView => ({
      id: `${channel}-coverage`,
      label: `${channelLabels[channel]} Coverage`,
      group: "Continuous CMYK separations",
      result: inkValuesToRaster(
        debug.coverages[channel],
        dimensions[0],
        dimensions[1],
        channel,
      ),
    })),
    ...channels.map((channel): DebugView => ({
      id: `${channel}-threshold`,
      label: `${channelLabels[channel]} Threshold`,
      group: "Screen threshold fields",
      result: scalarImageToRaster(
        debug.thresholds[channel],
        dimensions[0],
        dimensions[1],
      ),
    })),
    ...channels.map((channel): DebugView => ({
      id: `${channel}-ink-mask`,
      label: `${channelLabels[channel]} Ink Mask`,
      group: "Binary ink masks",
      result: inkValuesToRaster(
        debug.masks[channel],
        dimensions[0],
        dimensions[1],
        channel,
      ),
    })),
    {
      id: "final-result",
      label: "Idealized subtractive preview",
      group: "Composite",
      result: output,
    },
  ];
}
