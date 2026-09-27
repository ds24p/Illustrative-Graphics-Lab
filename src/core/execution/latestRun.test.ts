import { describe, expect, it } from "vitest";
import { LatestRun } from "./latestRun";

describe("LatestRun", () => {
  it("rejects A when B starts and A finishes after B", async () => {
    const runs = new LatestRun();
    let finishA!: (value: string) => void;
    let finishB!: (value: string) => void;
    const a = new Promise<string>((resolve) => { finishA = resolve; });
    const b = new Promise<string>((resolve) => { finishB = resolve; });
    const visible: string[] = [];
    const aId = runs.begin();
    const first = a.then((value) => { if (runs.isCurrent(aId)) visible.push(value); });
    const bId = runs.begin();
    const second = b.then((value) => { if (runs.isCurrent(bId)) visible.push(value); });

    finishB("B");
    await second;
    finishA("A");
    await first;
    expect(visible).toEqual(["B"]);
  });

  it("invalidates a run when inputs change", () => {
    const runs = new LatestRun();
    const current = runs.begin();
    runs.invalidate();
    expect(runs.isCurrent(current)).toBe(false);
  });
});
