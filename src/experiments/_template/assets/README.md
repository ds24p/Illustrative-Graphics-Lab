# Experiment assets

Keep assets used only by this experiment family here. Create subfolders such as
`brushes/`, `textures/`, or `patterns/` when useful.

Vite can turn an imported asset into a browser URL:

```ts
import brushTextureUrl from "./assets/brushes/dry-brush.png?url";
```

Public sample images that users choose in the interface may instead live under
`public/samples/<experiment-id>/`. In the experiment definition, use the shared
helper so URLs respect Vite's base path in development and on GitHub Pages:

```ts
import { publicUrl } from "../../core/assets/publicUrl";

const sampleUrl = publicUrl("samples/my-experiment/example.png");
```

Pass a path relative to `public/`, without the deployment prefix. Imported asset
URLs, data URLs and object URLs should be used directly rather than passed to
`publicUrl`.
