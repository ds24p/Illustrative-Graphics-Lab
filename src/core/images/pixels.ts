export function compositeChannelOverWhite(
  data: Uint8ClampedArray,
  pixelIndex: number,
  channelOffset: 0 | 1 | 2,
) {
  const alpha = data[pixelIndex * 4 + 3] / 255;
  return data[pixelIndex * 4 + channelOffset] * alpha + 255 * (1 - alpha);
}
