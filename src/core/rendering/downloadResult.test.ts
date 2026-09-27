import { afterEach, describe, expect, it, vi } from "vitest";
import type { PointResult } from "../results/types";
import { downloadResultAsPng } from "./downloadResult";

afterEach(() => vi.unstubAllGlobals());

describe("PNG export", () => {
  it("renders PointResult through the same Canvas path as the preview", async () => {
    const context = {
      fillStyle: "",
      globalAlpha: 1,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob(callback: (blob: Blob) => void) {
        callback(new Blob(["png"], { type: "image/png" }));
      },
    };
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", {
      createElement: (tag: string) => tag === "canvas" ? canvas : link,
    });
    const createObjectURL = vi.fn(() => "blob:stippling-result");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const result: PointResult = {
      kind: "points",
      width: 4,
      height: 3,
      points: [{ x: 1, y: 2, radius: 1, color: "#000" }],
    };
    await downloadResultAsPng(result, "stippling-result.png");

    expect([canvas.width, canvas.height]).toEqual([4, 3]);
    expect(context.arc).toHaveBeenCalledWith(1, 2, 1, 0, Math.PI * 2);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(link.download).toBe("stippling-result.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:stippling-result");
  });
});
