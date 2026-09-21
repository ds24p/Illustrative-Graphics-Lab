# Experiment assets

Keep assets used only by this experiment family here. Create subfolders such as
`brushes/`, `textures/`, or `patterns/` when useful.

Vite can turn an imported asset into a browser URL:

```ts
import brushTextureUrl from "./assets/brushes/dry-brush.png?url";
```

Public sample images that users choose in the interface may instead live under
`public/samples/<experiment-id>/` and be referenced with a `/samples/...` URL.
