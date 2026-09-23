import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textScreeningParameters } from "../../experiments/screening/parameters";
import { BackendSelector } from "./BackendSelector";
import { ParameterPanel } from "./ParameterPanel";

describe("experiment controls with changing capabilities", () => {
  it("renders a newly added parameter at its default value", () => {
    const markup = renderToStaticMarkup(createElement(ParameterPanel, {
      definitions: textScreeningParameters,
      values: { textSeed: 12345 },
      onChange: () => {},
    }));
    expect(markup).toContain("1.0x (8 x 14 px)");
  });

  it("keeps WebGPU unavailable while showing its reason and a retry control", () => {
    const markup = renderToStaticMarkup(createElement(BackendSelector, {
      supportedBackends: ["cpu", "webgpu"],
      value: "cpu",
      onChange: () => {},
      onRetry: () => {},
      availability: {
        cpu: { available: true },
        webgpu: { available: false, reason: "No adapter was returned." },
      },
    }));
    expect(markup).toContain("No adapter was returned.");
    expect(markup).toContain("Retry WebGPU availability");
    expect(markup).toContain('value="webgpu" disabled=""');
  });
});
