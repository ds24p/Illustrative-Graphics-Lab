import { describe, expect, it, vi } from "vitest";
import type { PathResult, PointResult } from "../results/types";
import { renderExperimentResult } from "./renderResult";

describe("generic point rendering", () => {
  it("uses PointMark radius and draws on the result background", () => {
    const arcs: Array<{ x: number; y: number; radius: number; color: string }> = [];
    const context = {
      fillStyle: "",
      globalAlpha: 1,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc(x: number, y: number, radius: number) {
        arcs.push({ x, y, radius, color: this.fillStyle });
      },
      fill: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const result: PointResult = {
      kind: "points",
      width: 8,
      height: 6,
      background: "#fff",
      points: [{ x: 2.5, y: 3, radius: 1, color: "#000" }],
    };

    renderExperimentResult(result, canvas);

    expect([canvas.width, canvas.height]).toEqual([8, 6]);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 8, 6);
    expect(arcs).toEqual([{ x: 2.5, y: 3, radius: 1, color: "#000" }]);
    expect(context.fill).toHaveBeenCalledTimes(1);
  });
});

describe("generic path rendering", () => {
  it("draws centerlines and closed seed markers with rounded geometry", () => {
    const context = {
      fillStyle: "", strokeStyle: "", globalAlpha: 1, lineWidth: 0, lineCap: "", lineJoin: "",
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const result: PathResult = {
      kind: "paths", width: 8, height: 6, background: "#fff",
      paths: [
        { points: [{ x: 1, y: 1 }, { x: 4, y: 3 }], stroke: "#08777a", width: 1.5 },
        { points: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }], closed: true, fill: "#e62f4a" },
      ],
    };
    renderExperimentResult(result, canvas);
    expect([canvas.width, canvas.height]).toEqual([8, 6]);
    expect(context.lineCap).toBe("round");
    expect(context.lineJoin).toBe("round");
    expect(context.moveTo).toHaveBeenCalledTimes(2);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.closePath).toHaveBeenCalledTimes(1);
    expect(context.fill).toHaveBeenCalledTimes(1);
  });
});
