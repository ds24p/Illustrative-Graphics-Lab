import type { ImageSource } from "./types";

const MAX_IMAGE_EDGE = 1800;

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
): Promise<ImageSource> {
  const image = await decodeImage(url);
  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
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

export async function loadImageFile(file: File): Promise<ImageSource> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file such as PNG, JPEG, or WebP.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image file could not be read."));
    reader.readAsDataURL(file);
  });

  return loadImageSource(dataUrl, file.name);
}
