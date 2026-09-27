export const MAX_CONE_SITE_INDEX = 262_143;
export const CONE_BACKGROUND_RGB = 0x7f7f7f;

export function encodeSiteIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index > MAX_CONE_SITE_INDEX) {
    throw new Error("Cone site index must fit in 18 bits.");
  }
  const red = index % 64;
  const green = (index >> 6) % 64;
  const blue = (index >> 12) % 64;
  return (red << 16) | (green << 8) | blue;
}

export function decodeSiteIndex(rgb: number): number {
  const red = (rgb >> 16) & 0xff;
  const green = (rgb >> 8) & 0xff;
  const blue = rgb & 0xff;
  return red + (green << 6) + (blue << 12);
}
