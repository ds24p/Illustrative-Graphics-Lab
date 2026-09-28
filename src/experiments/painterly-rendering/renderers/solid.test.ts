import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadResultAsPng } from "../../../core/rendering/downloadResult";
import { renderExperimentResult } from "../../../core/rendering/renderResult";
import { painterlyRenderingExperiment } from "../experiment";
import { createSolidPaintingSurface, solidStrokeResult } from "./solid";

afterEach(() => vi.unstubAllGlobals());

describe("solid curved brush renderer", () => {
  it("initializes once and draws consecutive layers without clearing or resizing", () => {
    const context = { fillStyle: "", fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), getImageData: vi.fn(() => ({ width: 4, height: 3 })) };
    const setWidth = vi.fn(), setHeight = vi.fn();
    const canvas = { set width(value: number) { setWidth(value); }, set height(value: number) { setHeight(value); }, getContext: () => context };
    vi.stubGlobal("document", { createElement: () => canvas });
    const surface = createSolidPaintingSurface(4, 3);
    const stroke = { points: [{ x: 1, y: 1 }], radius: 1, color: { r: 0, g: 0, b: 0 }, opacity: 1 };
    surface.drawLayer([stroke]); surface.drawLayer([stroke]); surface.snapshot();
    expect(setWidth).toHaveBeenCalledExactlyOnceWith(4);
    expect(setHeight).toHaveBeenCalledExactlyOnceWith(3);
    expect(context.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 4, 3);
    expect(context.fill).toHaveBeenCalledTimes(2);
    expect(context.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
  });
  it("renders quadratic paths, round caps and single-point dabs through the shared dispatcher", () => {
    const context = {
      globalAlpha: 1, lineCap: "", lineJoin: "", fillStyle: "", strokeStyle: "", lineWidth: 0,
      fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const attributes = { color: { r: 20, g: 40, b: 60 }, radius: 3, opacity: 0.7 };
    const result = solidStrokeResult(30, 20, [
      { ...attributes, points: [{ x: 2, y: 2 }, { x: 10, y: 10 }, { x: 18, y: 2 }] },
      { ...attributes, points: [{ x: 25, y: 10 }] },
    ]);
    renderExperimentResult(result, canvas, painterlyRenderingExperiment.renderers);
    expect([canvas.width, canvas.height]).toEqual([30, 20]);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 30, 20);
    expect(context.lineWidth).toBe(6);
    expect([context.lineCap, context.lineJoin]).toEqual(["round", "round"]);
    expect(context.moveTo).toHaveBeenCalledWith(2, 2);
    expect(context.quadraticCurveTo).toHaveBeenCalledWith(10, 10, 14, 6);
    expect(context.lineTo).toHaveBeenCalledWith(18, 2);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.arc).toHaveBeenCalledWith(25, 10, 3, 0, Math.PI * 2);
    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(context.globalAlpha).toBe(1);
  });

  it("passes stroke opacity to Canvas2D alpha compositing", () => {
    const alphaValues: number[] = [];
    let alpha = 1;
    const context = {
      get globalAlpha() { return alpha; },
      set globalAlpha(value: number) { alpha = value; alphaValues.push(value); },
      lineCap: "", lineJoin: "", fillStyle: "", strokeStyle: "", lineWidth: 0,
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(),
    };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const result = solidStrokeResult(8, 8, [{
      points: [{ x: 1, y: 1 }, { x: 5, y: 1 }], color: { r: 20, g: 40, b: 60 }, radius: 2, opacity: 0.5,
    }]);
    renderExperimentResult(result, canvas, painterlyRenderingExperiment.renderers);
    expect(alphaValues).toContain(0.5);
    expect(alpha).toBe(1);
  });

  it("exports strokes through the same registered renderer as the preview", async () => {
    const context = {
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    };
    const canvas = {
      width: 0, height: 0, getContext: () => context,
      toBlob(callback: (blob: Blob) => void, type: string) {
        expect(type).toBe("image/png");
        callback(new Blob(["encoded-png"], { type }));
      },
    };
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: (tag: string) => tag === "canvas" ? canvas : link });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:painting", revokeObjectURL });
    const result = solidStrokeResult(12, 10, [{
      points: [{ x: 2, y: 2 }, { x: 8, y: 6 }], color: { r: 10, g: 20, b: 30 }, radius: 2, opacity: 1,
    }]);
    await downloadResultAsPng(result, "painterly-rendering-result.png", painterlyRenderingExperiment.renderers);
    expect([canvas.width, canvas.height]).toEqual([12, 10]);
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(link.download).toBe("painterly-rendering-result.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:painting");
  });
});
