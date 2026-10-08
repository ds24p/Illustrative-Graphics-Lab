# GitHub Pages deployment

## Base path and routing

`vite.config.ts` uses `/` for `npm run dev` and
`/Illustrative-Graphics-Lab/` for the build and `npm run preview`.
`BrowserRouter` reads `import.meta.env.BASE_URL` as its `basename`.
Keep routes and links application-relative, for example `/experiments/dithering`.
If the repository name changes, update the build base in `vite.config.ts`.

Public files use `publicUrl("samples/example.png")` from
`src/core/assets/publicUrl.ts`. Call it once on a path relative to `public/`.
The same resolved URLs feed the card images, home background and source loader.
Each experiment still uses the common colorful reference image as its input;
the five result images are used only for listing previews and the home page.

Screening kernels and the glyph atlas use ES module imports. WGSL shaders use
`?raw` imports, and the stippling worker uses `new URL(..., import.meta.url)`.
Vite handles their build URLs. Painterly brushes are generated procedurally.
The favicon uses `%BASE_URL%` in HTML. The module entry in `index.html` is
processed by Vite; it should remain `/src/main.tsx` in source.

## Clean URLs and refresh

Run `npm run build`. Its `postbuild` script copies the generated `dist/index.html`
to `dist/404.html`. The existing Pages workflow uploads both as part of `dist`.
Use the npm command rather than running `vite build` alone to include this step.

GitHub Pages serves `404.html` when a requested path has no physical file.
That document loads the same application bundle with base-prefixed asset URLs.
The browser keeps the original path, query string and hash, so React Router can
render the requested experiment. No redirect or hash routing is needed.
Unknown application routes still display the lab's own Not Found page.

**Hosting limitation:** a direct request to a nested route receives HTTP 404 even
though the application renders correctly. This can affect crawlers and link
previews. A host with SPA rewrites or prerendered routes is needed if those
requests must return HTTP 200. Vite preview uses its own SPA fallback and does
not reproduce this HTTP status behavior.

## Verification after deployment

1. Run `npm run dev`; check `/`, `/experiments` and `/experiments/dithering` at
   localhost:5173, including refresh.
2. Run `npm test` and `npm run build`; confirm `dist/404.html` matches
   `dist/index.html` and both reference `/Illustrative-Graphics-Lab/assets/`.
3. After the GitHub Actions deployment finishes, open
   `https://ds24p.github.io/Illustrative-Graphics-Lab/` and navigate to the gallery.
4. Open an experiment in a new tab and refresh it. Check its shared reference
   image, all five gallery thumbnails, screening kernel previews and text atlas.
5. Check the browser's Network panel for failed image, script or worker requests.
   The initial document's 404 on a directly opened nested route is expected;
   its scripts, styles and images must load successfully.

A successful local build does not verify the live GitHub Pages deployment.

## Changed files

- `vite.config.ts`: separate development and production base paths.
- `src/app/App.tsx`: configure BrowserRouter's basename from Vite.
- `src/core/assets/publicUrl.ts`: shared public-file URL helper.
- `src/core/assets/publicUrl.test.ts`: root, repository and nested-base checks.
- `index.html`: base-aware favicon reference.
- `package.json`: run the fallback generator after a successful build.
- `tools/create-pages-fallback.mjs`: generate the Pages fallback document.
- `src/experiments/grayscale/definition.ts`: resolve source and listing images.
- `src/experiments/dithering/experiment.ts`: resolve source and listing images.
- `src/experiments/screening/experiment.ts`: resolve source and listing images.
- `src/experiments/stippling/experiment.ts`: resolve source and listing images.
- `src/experiments/painterly-rendering/experiment.ts`: resolve source and listing images.
- `src/dev/stipplingLloydBench.ts`: resolve its public reference image.
- `src/dev/stipplingOwnershipBench.ts`: resolve its public reference image.
- `src/experiments/_template/assets/README.md`: document base-aware asset usage.
- `DEPLOYMENT.md`: deployment behavior, limitations and verification instructions.

## Completed verification

- `npm run dev`: browser navigation from Home to the registry and Dithering,
  followed by refresh, succeeded under `/` with the reference image loaded.
- `npm test`: 363 tests passed across 46 test files.
- `npm run build`: TypeScript and Vite succeeded; the npm postbuild hook emitted
  `dist/404.html`. The existing bundle-size warning remains (about 534 kB).
- Build inspection: `index.html` and `404.html` are identical; scripts, styles,
  favicon, imported kernel images, glyph atlas and worker URLs use the project
  base. No doubled project prefix or root-only asset URL was found in the bundle.
- Browser checks against a local static server mounted at the project base:
  Home, gallery, all five experiment pages and their images rendered correctly.
  Direct nested navigation and refresh worked through the actual 404 fallback,
  including preservation of query parameters and the URL fragment.
- Image-Kernel Screening with the Smiley Face asset and Text Screening with the
  imported glyph atlas both produced output in that browser session.

These checks used local servers. No updated live deployment has been verified.

References: [Vite base paths](https://vite.dev/guide/build.html#public-base-path),
[BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter),
[GitHub Pages 404 documents](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).
