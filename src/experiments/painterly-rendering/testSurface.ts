import type { PaintingSurfaceFactory } from "./types";

// Orchestration test double: stamps control points into pixels. Canvas2D curves
// are checked separately. This helper is never imported by production code.
export const createTestPaintingSurface: PaintingSurfaceFactory = (width, height) => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  return {
    drawLayer(strokes) {
      for (const stroke of strokes) for (const point of stroke.points) {
        const i = (Math.floor(point.y) * width + Math.floor(point.x)) * 4;
        data[i] = stroke.color.r; data[i + 1] = stroke.color.g; data[i + 2] = stroke.color.b;
      }
    },
    snapshot: () => ({ width, height, data: data.slice() }) as ImageData,
  };
};
