import type { ImageSource } from "./types";

const MAX_IMAGE_EDGE = 1800;

export interface ImageLoadOptions {
  acceptedMimeTypes?: string[];
  maxFileBytes?: number;
  maxSourceEdge?: number;
  maxSourcePixels?: number;
  resizeMaxEdge?: number;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function decodeImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
}

export async function loadImageSource(
  url: string,
  name: string,
  options: ImageLoadOptions = {},
): Promise<ImageSource> {
  let image: HTMLImageElement;
  try {
    image = await decodeImage(url);
  } catch {
    throw new Error("The image could not be decoded.");
  }

  if (image.naturalWidth < 1 || image.naturalHeight < 1) {
    throw new Error("The image has invalid dimensions.");
  }

  if (
    options.maxSourceEdge &&
    Math.max(image.naturalWidth, image.naturalHeight) > options.maxSourceEdge
  ) {
    throw new Error(
      `The image must be at most ${options.maxSourceEdge} pixels on either edge.`,
    );
  }

  if (
    options.maxSourcePixels &&
    image.naturalWidth * image.naturalHeight > options.maxSourcePixels
  ) {
    throw new Error("The image dimensions are too large.");
  }

  const resizeMaxEdge = options.resizeMaxEdge ?? MAX_IMAGE_EDGE;
  const scale = Math.min(
    1,
    resizeMaxEdge / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Your browser could not create a 2D canvas context.");
  }

  context.drawImage(image, 0, 0, width, height);

  return {
    id: createId(),
    name,
    previewUrl: url,
    imageData: context.getImageData(0, 0, width, height),
  };
}

export async function loadImageFile(
  file: File,
  options: ImageLoadOptions = {},
): Promise<ImageSource> {
  const acceptedMimeTypes = options.acceptedMimeTypes;
  const accepted = acceptedMimeTypes
    ? acceptedMimeTypes.includes(file.type)
    : file.type.startsWith("image/");

  if (!accepted) {
    throw new Error("Choose an image file such as PNG, JPEG, or WebP.");
  }

  if (options.maxFileBytes && file.size > options.maxFileBytes) {
    const limitMb = options.maxFileBytes / (1024 * 1024);
    throw new Error(`The image file must be no larger than ${limitMb} MB.`);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image file could not be read."));
    reader.readAsDataURL(file);
  });

  return loadImageSource(dataUrl, file.name, options);
}
