# Adding an Experiment

An experiment is a family of related algorithms. Dithering is one experiment;
ordered dithering, Floyd-Steinberg, and line dithering are methods inside it.

Start by copying `src/experiments/_template/`. The template compiles, but it is
not registered, so it never appears in the gallery.

## The important pieces

```text
src/experiments/dithering/
|-- experiment.ts          family metadata and method list
|-- parameters.ts          shared and method-specific UI definitions
|-- types.ts               TypeScript parameter types
|-- assets/                assets owned only by this family
`-- methods/
    |-- ordered/
    |   |-- algorithm.cpu.ts
    |   |-- backend.cpu.ts
    |   `-- shader.wgsl     optional, later
    `-- floyd-steinberg/
        |-- algorithm.cpu.ts
        `-- backend.cpu.ts
```

The React pages do not import anything from `dithering/`. They discover the
family, methods, parameters, backends, and renderers through its definition.

## 1. Add a new experiment family

1. Copy `_template` to a folder with a short lowercase id, such as `dithering`.
2. Rename `TemplateParameters` and `templateExperiment`.
3. Update the metadata and description in `experiment.ts`.
4. Choose one method id as `defaultMethodId`.
5. Keep sample images in `public/samples/dithering/`, then list their URLs in
   `sampleImages`.
6. Import the completed definition in `src/experiments/registry.ts` and add it
   to the `experiments` array.

Example registry entry:

```ts
import { ditheringExperiment } from "./dithering";

export const experiments = [
  grayscaleExperiment,
  ditheringExperiment,
] as ExperimentDefinition<ExperimentParameters>[];
```

The registry is the only shared application file that a new family changes.

## 2. Add a method to an existing family

Create a folder under `methods/`, for example:

```text
src/experiments/dithering/methods/floyd-steinberg/
|-- algorithm.cpu.ts
`-- backend.cpu.ts
```

Then add one object to the family's `methods` array:

```ts
{
  id: "floyd-steinberg",
  label: "Floyd-Steinberg",
  description: "Diffuses quantization error to neighboring pixels.",
  parameters: floydSteinbergParameters,
  supportedBackends: ["cpu"],
  defaultBackend: "cpu",
  backends: { cpu: floydSteinbergCpuBackend },
}
```

Backend support belongs to each method because different algorithms have
different execution constraints. The experiment page derives its overall
backend badges from all methods, so there is no second list to maintain.

An algorithm strategy is not an execution backend. For example, Poisson
**Exact Distance** is the spacing rule; **CPU** and **Worker** run that same
rule in different places. Historical Occupancy Buffer is a different spacing
rule, not a backend. When one method has a strategy parameter and only some
strategies support a backend, use `backendConditions` in its method definition:

```ts
supportedBackends: ["cpu", "worker"],
backendConditions: { worker: { parameter: "spacingCheck", equals: "exact" } },
backends: { cpu: poissonCpuBackend, worker: poissonWorkerBackend },
```

The generic selector then shows Worker only for Exact Distance. The runner
checks the same condition, so a stale or programmatic Worker request cannot
run a different strategy by mistake.

### Add educational content to a method

Detailed teaching material belongs to the method definition, not to a React
component or algorithm file. Add `educationalContent` beside `description`:

```ts
{
  id: "floyd-steinberg",
  label: "Floyd-Steinberg",
  description: "Short text shown beside the controls.",
  educationalContent: {
    summary: "What the method does and what its output looks like.",
    steps: [
      "Quantize the current working value.",
      "Calculate its signed error.",
      "Distribute error to unprocessed neighbors.",
    ],
    mathematics: [
      {
        label: "Quantization error",
        expressions: ["e = adjusted source - quantized output"],
        explanation: "Optional context for the displayed equation.",
      },
    ],
    parameters: [
      {
        name: "Threshold",
        description: "Explain what changing it does to the result.",
      },
    ],
    characteristics: [
      "Deterministic raster-order error diffusion.",
      "Sequential dependency between neighboring pixels.",
    ],
    computation: {
      cpu: "A linear raster pass with mutable working values.",
      gpu: "Not directly pixel-parallel because later pixels consume error.",
    },
  },
  // parameters and backends follow
}
```

`mathematics` and `parameters` are optional. Use normal strings for equations
and matrices; the shared renderer preserves whitespace, so no mathematics
library is required. The experiment page immediately displays the selected
method's content and contains no family-specific conditions.

When educational text must follow a parameter choice, use declarative
variants. The first matching condition is shown:

```ts
educationalContent: {
  variants: [
    {
      when: { parameter: "strategy", equals: "none" },
      content: directQuantizationEducation,
    },
    {
      when: { parameter: "strategy", equals: "floyd-steinberg" },
      content: errorDiffusionEducation,
    },
  ],
},
```

Conditions use the same `equals`, `notEquals`, and `oneOf` rules as parameter
`visibleWhen`. This is useful for a Screening method whose explanation changes
with screen type, or a Painterly method with optional textured strokes.

## 3. Define parameters

Put controls shared by every method in the experiment's `parameters` array.
Put controls used by one method in that method's `parameters` array.

Supported kinds are:

- `number`: decimal numeric input;
- `integer`: whole-number input;
- `range`: slider with minimum, maximum, and step;
- `boolean`: toggle;
- `select`: experiment-defined options;
- `color`: browser color picker.

Every value also belongs in the parameter type and the family's complete
`defaultParameters` object. Usually, switching methods keeps entered values.
If a method needs a different default for a shared key (for example, a smaller
`maxAttempts` for a slower method), put only those overrides in that method's
`defaultParameters`. Selecting or resetting that method applies its overrides;
other values remain unchanged.

## 4. Show a parameter conditionally

Use `visibleWhen`; do not add algorithm names to `ParameterPanel.tsx`.

```ts
{
  key: "lineSpacing",
  kind: "range",
  label: "Line spacing",
  defaultValue: 6,
  min: 2,
  max: 24,
  step: 1,
  visibleWhen: { parameter: "colorMode", equals: "black-white" },
}
```

Multiple conditions form an AND rule:

```ts
visibleWhen: [
  { parameter: "colorMode", equals: "color" },
  { parameter: "useTexture", equals: true },
]
```

The condition system also supports `notEquals` and `oneOf`.

## 5. Implement the CPU algorithm

Keep computation in `algorithm.cpu.ts`. It receives browser data and plain
parameters and returns an `ExperimentResult`; it must not import React.

Wrap it in `backend.cpu.ts`:

```ts
export const orderedCpuBackend: ExperimentBackend<DitheringParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    return {
      output: runOrderedDithering(source.imageData, parameters),
      debugViews: debugEnabled
        ? createOrderedDebugViews(source.imageData, parameters)
        : undefined,
    };
  },
};
```

The execution layer selects this backend, measures it, and handles fallback.

## 6. Add intermediate or debug views

Debug views are optional named results returned beside the main output. They
use the same raster or vector result types and do not depend on React.

First advertise the views on the method so the generic page can show its
"Generate intermediate views" toggle:

```ts
debugViews: [
  {
    id: "density-map",
    label: "Density map",
    description: "The probability field used to place points.",
  },
  {
    id: "candidate-points",
    label: "Candidate points",
    description: "Points before rejection and relaxation.",
  },
],
```

Then return the matching named results only when requested:

```ts
export function runAlgorithm(
  source: ImageData,
  parameters: MyParameters,
  debugEnabled: boolean,
): ExperimentOutput {
  const output = createFinalResult(source, parameters);

  if (!debugEnabled) return { output };

  return {
    output,
    debugViews: [
      {
        id: "density-map",
        label: "Density map",
        result: createDensityMap(source, parameters),
      },
      {
        id: "candidate-points",
        label: "Candidate points",
        result: createCandidatePoints(source, parameters),
      },
    ],
  };
}
```

The generic page renders every returned view automatically. It does not know
what a density map, color separation, error map, or stroke seed means.

Avoid allocating large debug arrays or doing debug-only passes before checking
`debugEnabled`. Shared work that the final algorithm already needs can still be
reused when creating the views.

This is intentionally a result list, not a processing graph. Views have no
dependencies, connections, or execution order managed by the application.

## 7. Choose a result type

Use the result that best describes what the algorithm naturally produces:

- `RasterResult` for pixels and GPU textures read back as pixels;
- `PointResult` for stippling;
- `LineResult` for independent hatching or screening lines;
- `PathResult` for connected paths;
- `StrokeResult` for painterly marks;
- `PolygonResult` for mosaic cells or tiles.

Textured brush strokes use `StrokeResult` with the optional `texture` field on
each stroke. They do not need a separate top-level result kind.

These are explicit discriminated unions rather than classes. They provide clear
renderer dispatch and useful TypeScript checking while remaining plain data.
A single generic primitive structure would be shorter, but every renderer would
then need to validate which fields make sense together.

Only raster rendering is built in today. When a real experiment first returns
points, paths, strokes, or polygons, add its renderer and expose it through the
optional `renderers` map on the experiment definition.

## 8. Add experiment-owned assets

Keep implementation assets beside the family:

```text
src/experiments/painterly/assets/brushes/dry-brush.png
```

Import them through Vite so the build creates a stable URL:

```ts
import dryBrushUrl from "./assets/brushes/dry-brush.png?url";
```

Use `public/samples/<experiment-id>/` only for sample images selected directly
by users. This keeps brush textures and pattern tables out of a global folder.

## 9. Add WebGPU later

WebGPU is also registered per method. Keep its adapter beside that method:

```text
methods/ordered/
|-- backend.webgpu.ts
`-- shader.wgsl
```

Implement `WebGpuExperimentBackend`, then update only that method:

```ts
supportedBackends: ["cpu", "webgpu"],
backends: {
  cpu: orderedCpuBackend,
  webgpu: orderedWebGpuBackend,
},
```

Keep CPU registered as the fallback. If WebGPU is unavailable or its
availability check fails, `runExperiment` selects that method's CPU backend and
reports the reason to the interface.

The template's `backend.webgpu.example.ts` and `shader.wgsl` show file placement
and interface shape only. They are intentionally not registered or implemented.

## 10. Add a Worker when the CPU run blocks the UI

A Worker is useful for expensive CPU methods, not automatically for every
method. Keep the mathematical function in `algorithm.cpu.ts`. The Worker entry
imports that function; do not duplicate its calculations in a separate
`algorithm.worker.ts`. See `src/experiments/stippling/worker/` for a small typed
request/response protocol and a reusable Worker client. A method's
`backend.worker.ts` converts inputs/results, while React stays unaware of the
message format.

If you transfer an `ArrayBuffer`, its sender loses access to it. Derive or copy
only the data the Worker needs; do not transfer the preview's original
`ImageData` buffer. Generate expensive debug data in the Worker only when
`debugEnabled` is true. Return algorithmic data and debug results, leaving
Canvas rendering on the main thread. Connect `signal` to cancellation and
dispose of the Worker when its page is left. The generic runner can fall back
to the same method's CPU backend after a Worker failure, but cancellation is
not a failure. Compare both output parity and timing: Worker algorithm time
is different from its end-to-end time including messages and preparation.

## Final checklist

1. The family id, method ids, and parameter keys are unique.
2. Every parameter has a matching typed value and default value.
3. Every method has at least one registered backend.
4. Debug view ids match between metadata and returned results.
5. Debug-only allocations happen after checking `debugEnabled`.
6. Algorithm files do not import React.
7. Experiment-only assets stay inside the family folder.
8. The family is added to `registry.ts` only after placeholders are replaced.
9. Every method has educational content that describes its actual implementation.
10. Run `npm run typecheck`, `npm test`, and `npm run build`.
