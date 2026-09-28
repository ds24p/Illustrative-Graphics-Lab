import { afterEach, describe, expect, it, vi } from "vitest";
import { generateBrushMask } from "../brushes";
import { solidStrokeResult } from "./solid";
import { drawTexturedStrokes, texturedStrokeResult } from "./textured";

afterEach(() => vi.unstubAllGlobals());

function fakeContext() {
  const rotations: number[] = [];
  const images: unknown[] = [];
  return {
    rotations,
    images,
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    fillStyle: "",
    fillRect: vi.fn(),
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
    rotate: (angle: number) => rotations.push(angle),
    drawImage: (...args: unknown[]) => images.push(args),
  };
}

function installStampDocument(context: ReturnType<typeof fakeContext>) {
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
}

describe("procedural textured stroke renderer", () => {
  it("uses the same stroke geometry as the solid renderer", () => {
    const strokes = [{ points: [{ x: 1, y: 1 }, { x: 4, y: 5 }, { x: 10, y: 2 }], color: { r: 30, g: 40, b: 50 }, radius: 2, opacity: 0.7 }];
    const texture = { type: "bristle" as const, mask: generateBrushMask("bristle", 16, 16, 4), textureSpacing: 0.3, textureScale: 1, rotationOffset: 0 };
    const solid = solidStrokeResult(20, 20, strokes);
    const textured = texturedStrokeResult(20, 20, strokes, texture);
    expect(textured.strokes.map((stroke) => stroke.points)).toEqual(solid.strokes.map((stroke) => stroke.points));
    expect(textured.texture?.type).toBe("bristle");
  });

  it("places deterministic arc-length stamps along curves and keeps tangent signs continuous", () => {
    const context = fakeContext();
    installStampDocument(context);
    const strokes = [{ points: [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 12, y: 8 }, { x: 18, y: 8 }], width: 4, color: "rgb(20 30 40)", opacity: 0.8 }];
    const texture = { type: "soft", maskWidth: 16, maskHeight: 16, mask: generateBrushMask("soft", 16, 16, 9).data, textureSpacing: 0.5, textureScale: 1, rotationOffset: 0 };
    drawTexturedStrokes(context as never, strokes, texture);
    expect(context.images.length).toBeGreaterThan(5);
    expect(context.rotations.every(Number.isFinite)).toBe(true);
    for (let i = 1; i < context.rotations.length; i++) {
      expect(Math.abs(context.rotations[i] - context.rotations[i - 1])).toBeLessThan(Math.PI);
    }
  });

  it("changes footprint size and rotation without changing geometry", () => {
    const context = fakeContext();
    installStampDocument(context);
    const stroke = [{ points: [{ x: 1, y: 1 }, { x: 11, y: 1 }], width: 6, color: "rgb(1 2 3)", opacity: 1 }];
    const mask = generateBrushMask("flat", 8, 8, 2).data;
    const first = { type: "flat", maskWidth: 8, maskHeight: 8, mask, textureSpacing: 0.3, textureScale: 1, rotationOffset: 0 };
    drawTexturedStrokes(context as never, stroke, first);
    const firstArgs = context.images[0] as unknown[];
    context.images.length = 0;
    drawTexturedStrokes(context as never, stroke, { ...first, textureScale: 1.5, rotationOffset: 35 });
    const secondArgs = context.images[0] as unknown[];
    expect(secondArgs.slice(-4, -2)).not.toEqual(firstArgs.slice(-4, -2));
    expect(context.rotations.at(-1)).toBeCloseTo(35 * Math.PI / 180);
    expect(stroke[0].points).toEqual([{ x: 1, y: 1 }, { x: 11, y: 1 }]);
  });

  it("uses physical brush diameter for texture spacing", () => {
    const stroke = [{ points: [{ x: 0, y: 0 }, { x: 24, y: 0 }], width: 8, color: "rgb(1 2 3)", opacity: 1 }];
    const mask = generateBrushMask("soft", 8, 8, 3).data;
    const stampCount = (spacing: number) => {
      const context = fakeContext();
      installStampDocument(context);
      drawTexturedStrokes(context as never, stroke, { type: "soft", maskWidth: 8, maskHeight: 8, mask, textureSpacing: spacing, textureScale: 1, rotationOffset: 0 });
      return context.images.length;
    };
    expect(stampCount(0.2)).toBeGreaterThan(stampCount(0.5));
    expect(stampCount(0.5)).toBeGreaterThan(stampCount(1));
  });
});
