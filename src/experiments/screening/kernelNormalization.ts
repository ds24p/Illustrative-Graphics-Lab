import { compositeChannelOverWhite } from "../../core/images/pixels";
import { processingBrightness } from "./intensity";
import type { ScreeningKernel } from "./types";

export const MAX_KERNEL_DIMENSION = 256;

function assertTargetDimension(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_KERNEL_DIMENSION) {
    throw new Error(
      `${name} must be a whole number from 1 to ${MAX_KERNEL_DIMENSION}.`,
    );
  }
}

function sampleCompositedChannel(
  source: ImageData,
  sourceX: number,
  sourceY: number,
  channelOffset: 0 | 1 | 2,
) {
  const x0 = Math.max(0, Math.min(source.width - 1, Math.floor(sourceX)));
  const y0 = Math.max(0, Math.min(source.height - 1, Math.floor(sourceY)));
  const x1 = Math.min(source.width - 1, x0 + 1);
  const y1 = Math.min(source.height - 1, y0 + 1);
  const fractionX = Math.max(0, Math.min(1, sourceX - x0));
  const fractionY = Math.max(0, Math.min(1, sourceY - y0));

  const topLeft = compositeChannelOverWhite(
    source.data,
    y0 * source.width + x0,
    channelOffset,
  );
  const topRight = compositeChannelOverWhite(
    source.data,
    y0 * source.width + x1,
    channelOffset,
  );
  const bottomLeft = compositeChannelOverWhite(
    source.data,
    y1 * source.width + x0,
    channelOffset,
  );
  const bottomRight = compositeChannelOverWhite(
    source.data,
    y1 * source.width + x1,
    channelOffset,
  );
  const top = topLeft + (topRight - topLeft) * fractionX;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * fractionX;

  return top + (bottom - top) * fractionY;
}

export function normalizeKernelImage(
  source: ImageData,
  targetWidth: number,
  targetHeight: number,
): ScreeningKernel {
  assertTargetDimension(targetWidth, "Kernel width");
  assertTargetDimension(targetHeight, "Kernel height");

  if (
    source.width < 1 ||
    source.height < 1 ||
    source.data.length !== source.width * source.height * 4
  ) {
    throw new Error("The kernel image has invalid dimensions or pixel data.");
  }

  const values = new Float32Array(targetWidth * targetHeight);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = ((y + 0.5) * source.height) / targetHeight - 0.5;
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = ((x + 0.5) * source.width) / targetWidth - 0.5;
      // Resampling happens in RGB first; brightness is extracted afterwards.
      const red = Math.round(sampleCompositedChannel(source, sourceX, sourceY, 0));
      const green = Math.round(
        sampleCompositedChannel(source, sourceX, sourceY, 1),
      );
      const blue = Math.round(sampleCompositedChannel(source, sourceX, sourceY, 2));
      values[y * targetWidth + x] = processingBrightness(red, green, blue);
    }
  }

  return { width: targetWidth, height: targetHeight, values };
}
