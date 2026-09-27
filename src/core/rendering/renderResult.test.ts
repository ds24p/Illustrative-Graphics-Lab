import { describe, expect, it, vi } from "vitest";
import type { PointResult } from "../results/types";
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
