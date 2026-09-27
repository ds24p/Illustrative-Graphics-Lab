import { describe, expect, it } from "vitest";
import { CONE_BACKGROUND_RGB, decodeSiteIndex, encodeSiteIndex, MAX_CONE_SITE_INDEX } from "./indexColor";

describe("historical RGB site IDs", () => {
  it("round-trips boundaries in the course sketch's base-64 encoding", () => {
    for (const index of [0, 1, 63, 64, 4095, 4096, 10000, 250000, 262143]) {
      expect(decodeSiteIndex(encodeSiteIndex(index))).toBe(index);
    }
    expect(encodeSiteIndex(0)).toBe(0);
    expect(encodeSiteIndex(64)).toBe(0x000100);
    expect(encodeSiteIndex(4096)).toBe(0x000001);
  });

  it("has no collisions across all 262144 valid indices", () => {
    const colors = new Set<number>();
    for (let index = 0; index <= MAX_CONE_SITE_INDEX; index += 1) {
      colors.add(encodeSiteIndex(index));
    }
    expect(colors.size).toBe(MAX_CONE_SITE_INDEX + 1);
  });

  it("does not mistake gray 127 background for a normal site", () => {
    expect(decodeSiteIndex(CONE_BACKGROUND_RGB)).toBeGreaterThan(MAX_CONE_SITE_INDEX);
    expect(() => encodeSiteIndex(-1)).toThrow(/18 bits/);
    expect(() => encodeSiteIndex(MAX_CONE_SITE_INDEX + 1)).toThrow(/18 bits/);
  });
});
