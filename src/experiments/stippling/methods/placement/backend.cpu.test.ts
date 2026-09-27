import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageSource } from "../../../../core/images/types";
import { runExperiment } from "../../../../core/execution/runExperiment";
import { stipplingExperiment } from "../../experiment";
import { placementCpuBackend } from "./backend.cpu";

afterEach(() => vi.unstubAllGlobals());

function source(): ImageSource {
  return {
    id: "black-test",
    name: "black-test",
    previewUrl: "",
    imageData: {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]),
    } as ImageData,
  };
}

describe("Placement CPU backend", () => {
  it("converts Dot Size diameter to PointResult radius and reports termination", async () => {
    const parameters = {
      ...stipplingExperiment.defaultParameters,
      targetPoints: 4,
      maxAttempts: 10,
      dotSize: 2,
    };
    const run = await runExperiment(
      stipplingExperiment,
      "placement",
      source(),
      parameters,
      "cpu",
    );
    expect(run.output.kind).toBe("points");
    if (run.output.kind !== "points") throw new Error("Expected point output.");
    expect(run.output.points).toHaveLength(4);
    expect(run.output.points.every((point) => point.radius === 1)).toBe(true);
    expect(run.statistics).toEqual([
      { label: "Accepted points", value: "4" },
      { label: "Attempts", value: "4" },
      { label: "Target reached", value: "Yes" },
      { label: "Acceptance rate", value: "100.0%" },
    ]);
  });

  it("does not let optional debug views change points", async () => {
    vi.stubGlobal("ImageData", class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    });
    const parameters = { ...stipplingExperiment.defaultParameters, targetPoints: 4 };
    const input = { source: source(), parameters, methodId: "placement" };
    const plain = await placementCpuBackend.run({ ...input, debugEnabled: false });
    const debug = await placementCpuBackend.run({ ...input, debugEnabled: true });

    expect(debug.output).toEqual(plain.output);
    expect(plain.debugViews).toBeUndefined();
    expect(debug.debugViews?.map(({ id }) => id)).toEqual([
      "original",
      "processing-brightness",
      "darkness-density",
      "final-stipples",
    ]);
    expect(debug.debugViews?.at(-1)?.result).toBe(debug.output);
  });
});
