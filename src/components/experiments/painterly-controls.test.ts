import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DebugView } from "../../core/results/types";
import { painterlyDefaults, painterlyParameters } from "../../experiments/painterly-rendering/parameters";
import { DebugViewGallery } from "./DebugViewGallery";
import { ParameterPanel } from "./ParameterPanel";

describe("list parameters and selected debug views", () => {
  it("shows normalized brush order, invalid input feedback, and the selected distance units", () => {
    const render = (values: typeof painterlyDefaults) => renderToStaticMarkup(createElement(ParameterPanel, {
      definitions: painterlyParameters, values, onChange: () => {},
    }));
    const scaled = render({ ...painterlyDefaults, brushSizes: "4,16,8,4" });
    expect(scaled).toContain("Actual order: 16 px → 8 px → 4 px");
    expect(scaled).toContain("Stroke step (× radius)");
    expect(scaled).toContain("Stroke geometry");
    expect(scaled).toContain("Direction Following");
    expect(scaled).toContain("Stroke Opacity");
    expect(scaled).toContain("Color Jitter");
    expect(scaled).toContain("Stroke length is measured in segments.");
    expect(scaled).not.toContain("Stroke step (px)");
    const fixed = render({ ...painterlyDefaults, distanceMode: "pixels" });
    expect(fixed).toContain("Stroke step (px)");
    expect(fixed).not.toContain("Stroke step (× radius)");
    expect(render({ ...painterlyDefaults, brushSizes: "0" })).toContain('aria-invalid="true"');
    const textured = render({ ...painterlyDefaults, strokeRendering: "textured" });
    expect(textured).toContain("Stroke Rendering");
    expect(textured).toContain("Brush Type");
    expect(textured).toContain("Texture Spacing");
    expect(textured).toContain("Brush Mask");
    expect(render({ ...painterlyDefaults, strokeRendering: "solid" })).not.toContain("Texture Spacing");
  });

  it("shows one selected canvas and preserves gallery behavior for other experiments", () => {
    const views: DebugView[] = [16, 8, 4].flatMap((radius) => ["reference", "canvas-after-layer"].map((id) => ({
      id: `${radius}-${id}`, definitionId: id, group: `${radius} px`, label: `${id} (${radius} px)`,
      result: { kind: "points" as const, width: 1, height: 1, points: [] },
    })));
    const selected = renderToStaticMarkup(createElement(DebugViewGallery, {
      views, selection: { groupLabel: "Brush scale", viewLabel: "Debug view", initialViewId: "canvas-after-layer" },
    }));
    expect(selected.match(/<canvas/g)).toHaveLength(1);
    expect(selected).toContain('aria-label="canvas-after-layer (16 px)"');
    expect(selected).toContain("Brush scale");
    const gallery = renderToStaticMarkup(createElement(DebugViewGallery, { views }));
    expect(gallery.match(/<canvas/g)).toHaveLength(6);
  });
});
