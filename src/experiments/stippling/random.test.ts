import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./random";

function sequence(seed: number) {
  const next = createSeededRandom(seed);
  return Array.from({ length: 12 }, () => next());
}

describe("Placement random stream", () => {
  it("repeats the same sequence for the same seed", () => {
    expect(sequence(12345)).toEqual(sequence(12345));
  });

  it("changes the sequence when the seed changes", () => {
    expect(sequence(12345)).not.toEqual(sequence(12346));
  });

  it("returns values in [0, 1) including for seed zero", () => {
    for (const value of sequence(0)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
