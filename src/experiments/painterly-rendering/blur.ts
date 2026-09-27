import type { RgbImage } from "./types";

// Separable Gaussian, truncated at 3σ, with clamped boundary samples.
export function blurReference(source: RgbImage, sigma: number): RgbImage {
  if (!Number.isFinite(sigma) || sigma < 0) throw new Error("Blur sigma must be finite and nonnegative.");
  if (sigma === 0) return { ...source, data: source.data.slice() };
  const radius = Math.ceil(sigma * 3);
  const kernel = new Float64Array(radius * 2 + 1);
  let total = 0;
  for (let k = -radius; k <= radius; k++) {
    kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    total += kernel[k + radius];
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= total;
  const { width, height } = source;
  const horizontal = new Float32Array(source.data.length);
  const data = new Float32Array(source.data.length);
  for (const vertical of [false, true]) {
    const input = vertical ? horizontal : source.data;
    const output = vertical ? data : horizontal;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let k = -radius; k <= radius; k++) {
          const sx = vertical ? x : Math.max(0, Math.min(width - 1, x + k));
          const sy = vertical ? Math.max(0, Math.min(height - 1, y + k)) : y;
          const i = (sy * width + sx) * 3;
          const weight = kernel[k + radius];
          r += input[i] * weight;
          g += input[i + 1] * weight;
          b += input[i + 2] * weight;
        }
        const i = (y * width + x) * 3;
        output[i] = r; output[i + 1] = g; output[i + 2] = b;
      }
    }
  }
  return { width, height, data };
}
