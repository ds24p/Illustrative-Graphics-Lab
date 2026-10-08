import { afterEach, describe, expect, it, vi } from "vitest";
import { publicUrl } from "./publicUrl";

afterEach(() => vi.unstubAllEnvs());

describe("public asset URLs", () => {
  it.each(["/", "/Illustrative-Graphics-Lab/", "/another/project/"])(
    "resolves public files independently of the current route under %s",
    (base) => {
      vi.stubEnv("BASE_URL", base);
      expect(publicUrl("samples/grayscale-still-life.png"))
        .toBe(`${base}samples/grayscale-still-life.png`);
      expect(publicUrl("/samples/dithering-result.png"))
        .toBe(`${base}samples/dithering-result.png`);
    },
  );
});
