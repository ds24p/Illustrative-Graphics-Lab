# Experiment family template

Copy this entire folder to `src/experiments/<family-id>/`. Rename
`TemplateParameters`, `templateExperiment`, labels, metadata, and method folders.

The example contains:

- shared parameters in `parameters.ts`;
- two methods with different parameter lists;
- method-owned educational content rendered by the generic experiment page;
- one CPU backend per method;
- an optional output plus two named intermediate debug views;
- conditional parameters using `visibleWhen`;
- a local `assets/` directory;
- an unregistered WebGPU skeleton and WGSL file;
- a raster result returned by both example algorithms.

The template is deliberately not in the central registry. After replacing its
placeholder content, import the real definition in `../registry.ts` and add it
to the `experiments` array.
