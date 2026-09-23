import { describe, expect, it } from "vitest";
import { resolveMethodEducationalContent } from "../../core/experiments/education";
import { ditheringExperiment } from "./experiment";

function educationFor(methodId: string, strategy = "none") {
  const method = ditheringExperiment.methods.find(
    (candidate) => candidate.id === methodId,
  );
  if (!method) throw new Error(`Missing method ${methodId}`);

  return resolveMethodEducationalContent(method.educationalContent, {
    ...ditheringExperiment.defaultParameters,
    paletteDitheringStrategy: strategy,
  });
}

describe("Dithering educational content", () => {
  it("provides complete content for every registered method", () => {
    for (const method of ditheringExperiment.methods) {
      const content = educationFor(method.id);
      expect(content, method.id).toBeDefined();
      expect(content?.summary.length, method.id).toBeGreaterThan(0);
      expect(content?.steps.length, method.id).toBeGreaterThan(0);
      expect(content?.characteristics.length, method.id).toBeGreaterThan(0);
      expect(content?.computation.cpu.length, method.id).toBeGreaterThan(0);
      expect(content?.computation.gpu.length, method.id).toBeGreaterThan(0);
    }
  });

  it("selects separate Fixed Palette explanations for direct and diffused output", () => {
    expect(educationFor("fixed-palette", "none")?.title).toBe(
      "Fixed Palette Quantization",
    );
    expect(educationFor("fixed-palette", "floyd-steinberg")?.title).toBe(
      "Fixed Palette + Floyd-Steinberg",
    );
  });

  it("selects separate Median Cut application explanations", () => {
    expect(educationFor("median-cut", "none")?.title).toBe(
      "Generated Palette - Median Cut",
    );
    expect(educationFor("median-cut", "floyd-steinberg")?.title).toBe(
      "Median Cut Palette + Floyd-Steinberg",
    );
  });

  it("documents the preserved strict threshold and line compensation", () => {
    const twoDimensional = educationFor("floyd-steinberg-2d");
    const lines = educationFor("floyd-steinberg-lines");

    expect(JSON.stringify(twoDimensional)).toContain("a > 0.5");
    expect(JSON.stringify(lines)).toContain("(m - 1)");
  });
});
