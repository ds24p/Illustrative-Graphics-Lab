import { compositeChannelOverWhite } from "../../core/images/pixels";
import type { RgbColor, RgbImage } from "./types";

export function sourceRgb(source: ImageData): RgbImage {
  const { width, height } = source;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || source.data.length !== width * height * 4) {
    throw new Error("Painterly rendering needs a nonempty RGBA source image.");
  }
  const data = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    data[i * 3] = compositeChannelOverWhite(source.data, i, 0);
    data[i * 3 + 1] = compositeChannelOverWhite(source.data, i, 1);
    data[i * 3 + 2] = compositeChannelOverWhite(source.data, i, 2);
  }
  return { width, height, data };
}

export function whiteCanvas(width: number, height: number): RgbImage {
  return { width, height, data: new Float32Array(width * height * 3).fill(255) };
}

export function sampleColor(image: RgbImage, x: number, y: number): RgbColor {
  const px = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const i = (py * image.width + px) * 3;
  return { r: image.data[i], g: image.data[i + 1], b: image.data[i + 2] };
}

export function rgbImageData(image: RgbImage): ImageData {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.width * image.height; i++) {
    data[i * 4] = image.data[i * 3];
    data[i * 4 + 1] = image.data[i * 3 + 1];
    data[i * 4 + 2] = image.data[i * 3 + 2];
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, image.width, image.height);
}
