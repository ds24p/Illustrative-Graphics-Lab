import type { ImageSource } from "../../core/images/types";

export const builtInBrushTypes = ["soft", "flat", "bristle", "dry", "rough"] as const;
export type BuiltInBrushType = typeof builtInBrushTypes[number];
export type BrushType = BuiltInBrushType | "custom";

export interface BrushMask {
  width: number;
  height: number;
  data: Float32Array;
}

export interface BrushTextureConfig {
  type: BrushType;
  mask: BrushMask;
  textureSpacing: number;
  textureScale: number;
  rotationOffset: number;
}

const maskCache = new Map<string, BrushMask>();

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(1e-9, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function deterministicNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453123;
  return value - Math.floor(value);
}

function proceduralValue(type: BuiltInBrushType, u: number, v: number, seed: number) {
  const radius = Math.hypot(u, v);
  const ellipse = 1 - smoothstep(0.72, 1.02, radius);
  if (type === "soft") {
    return clamp(Math.exp(-2.8 * radius * radius) * ellipse);
  }
  if (type === "flat") {
    const edge = Math.max(Math.abs(u), Math.abs(v));
    return clamp(1 - smoothstep(0.84, 1.0, edge));
  }
  if (type === "bristle") {
    const fiber = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(v * 30 + seed * 0.37));
    const variation = 0.9 + 0.1 * Math.sin(u * 7 + seed * 0.11);
    return clamp(ellipse * fiber * variation);
  }
  if (type === "dry") {
    const coherent = 0.5 + 0.25 * Math.sin(u * 13 + seed * 0.23) + 0.25 * Math.sin(v * 17 - seed * 0.31);
    const coverage = smoothstep(0.31, 0.7, coherent);
    return clamp(ellipse * coverage);
  }
  const grain = 0.5 + 0.18 * Math.sin(u * 24 + seed * 0.13) + 0.16 * Math.sin(v * 19 - seed * 0.19) + 0.16 * (deterministicNoise(u * 9, v * 9, seed) - 0.5);
  const roughEdge = 1 - smoothstep(0.88, 1.08, radius + 0.07 * Math.sin(u * 15 + v * 11 + seed));
  return clamp(Math.max(0, grain) * roughEdge);
}

export function generateBrushMask(type: BuiltInBrushType, width = 64, height = 64, seed = 12345): BrushMask {
  const safeWidth = Math.max(4, Math.floor(width));
  const safeHeight = Math.max(4, Math.floor(height));
  const data = new Float32Array(safeWidth * safeHeight);
  for (let y = 0; y < safeHeight; y++) {
    for (let x = 0; x < safeWidth; x++) {
      const u = (x + 0.5) / safeWidth * 2 - 1;
      const v = (y + 0.5) / safeHeight * 2 - 1;
      data[y * safeWidth + x] = proceduralValue(type, u, v, seed);
    }
  }
  return { width: safeWidth, height: safeHeight, data };
}

function customMask(source: ImageSource, width = 64, height = 64): BrushMask {
  const input = source.imageData;
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 1 || input.height < 1 || input.data.length < input.width * input.height * 4) {
    throw new Error("The custom brush image has invalid pixel data.");
  }
  const data = new Float32Array(width * height);
  let alphaRange = 0;
  let minimumAlpha = 255;
  let maximumAlpha = 0;
  for (let i = 3; i < input.data.length; i += 4) {
    minimumAlpha = Math.min(minimumAlpha, input.data[i]);
    maximumAlpha = Math.max(maximumAlpha, input.data[i]);
  }
  alphaRange = maximumAlpha - minimumAlpha;
  const useAlpha = alphaRange > 8 || minimumAlpha < 245;
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(input.height - 1, Math.floor(y / height * input.height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(input.width - 1, Math.floor(x / width * input.width));
      const index = (sourceY * input.width + sourceX) * 4;
      const coverage = useAlpha
        ? input.data[index + 3] / 255
        : (0.2126 * input.data[index] + 0.7152 * input.data[index + 1] + 0.0722 * input.data[index + 2]) / 255;
      data[y * width + x] = clamp(coverage);
    }
  }
  return { width, height, data };
}

function customKey(source: ImageSource) {
  const data = source.imageData.data;
  let hash = 2166136261;
  for (let i = 0; i < data.length; i += Math.max(1, Math.floor(data.length / 256))) {
    hash ^= data[i];
    hash = Math.imul(hash, 16777619);
  }
  return `${source.id}:${source.imageData.width}x${source.imageData.height}:${hash >>> 0}`;
}

export function getBrushMask(type: BrushType, seed: number, custom?: ImageSource | null, width = 64, height = 64): BrushMask {
  const key = type === "custom" && custom
    ? `custom:${customKey(custom)}:${width}x${height}`
    : `${type}:${seed >>> 0}:${width}x${height}`;
  const cached = maskCache.get(key);
  if (cached) return cached;
  const mask = type === "custom"
    ? custom ? customMask(custom, width, height) : generateBrushMask("soft", width, height, seed)
    : generateBrushMask(type, width, height, seed);
  maskCache.set(key, mask);
  return mask;
}

export function clearBrushMaskCache() {
  maskCache.clear();
}

export function brushTypeLabel(type: BrushType) {
  return type === "custom" ? "Custom Brush" : `${type[0].toUpperCase()}${type.slice(1)} Brush`;
}
