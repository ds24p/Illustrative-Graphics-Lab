import { describe, expect, it, vi } from "vitest";
import { renderExperimentResult } from "../../../core/rendering/renderResult";
import { painterlyRenderingExperiment } from "../experiment";
import { solidStrokeResult } from "./solid";

describe("solid curved brush renderer", () => {
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
});
