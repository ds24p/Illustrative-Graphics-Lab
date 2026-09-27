import { describe, expect, it } from "vitest";
import { resolveMethodEducationalContent } from "../../core/experiments/education";
import { getExperimentMethod, getMethodDebugViews, getMethodSupportedBackends } from "../../core/experiments/methods";
import { stipplingExperiment } from "./experiment";
import type { StipplingParameters } from "./types";

const defaults = stipplingExperiment.defaultParameters;

function viewIds(methodId: string, overrides: Partial<Pick<StipplingParameters, "spacingCheck" | "lloydMode">>) {
  const method = getExperimentMethod(stipplingExperiment, methodId);
  return getMethodDebugViews(stipplingExperiment, method, { ...defaults, ...overrides }).map((view) => view.id);
}

describe("Stippling presentation metadata", () => {
  it("shows occupancy views only for the historical Poisson strategy", () => {
    expect(viewIds("poisson", { spacingCheck: "exact" })).not.toContain("occupancy-buffer");
    expect(viewIds("poisson", { spacingCheck: "historical-occupancy" })).toContain("occupancy-buffer");
    expect(viewIds("poisson", { spacingCheck: "historical-occupancy" })).toContain("centers-over-occupancy");
  });

  it("keeps sampled and historical Lloyd ownership views distinct", () => {
    const sampled = viewIds("lloyd", { lloydMode: "weighted" });
    const historical = viewIds("lloyd", { lloydMode: "historical-cone" });
    expect(sampled).toContain("voronoi-ownership");
    expect(sampled).not.toContain("encoded-ownership");
    expect(historical).not.toContain("voronoi-ownership");
    expect(historical).toContain("encoded-ownership");
    expect(historical).toContain("decoded-ownership");
  });

  it("resolves strategy-specific education and execution support", () => {
    const method = getExperimentMethod(stipplingExperiment, "lloyd");
    const sampled = { ...defaults, lloydMode: "weighted" as const };
    const historical = { ...defaults, lloydMode: "historical-cone" as const };
    const sampledEducation = resolveMethodEducationalContent(method.educationalContent, sampled);
    const historicalEducation = resolveMethodEducationalContent(method.educationalContent, historical);

    expect(sampledEducation?.collapseDetails).toBe(true);
    expect(sampledEducation?.computation.worker).toBeTruthy();
    expect(sampledEducation?.executionSummary).toContain("WebGPU");
    expect(historicalEducation?.title).toContain("Historical Cone");
    expect(historicalEducation?.executionSummary).toContain("CPU only");
    expect(getMethodSupportedBackends(method, sampled)).toEqual(["cpu", "worker", "webgpu"]);
    expect(getMethodSupportedBackends(method, historical)).toEqual(["cpu"]);
  });
});
