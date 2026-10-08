import { copyFile } from "node:fs/promises";

// GitHub Pages serves this document for routes without a physical file.
// Keep the requested URL so BrowserRouter can read the path, query and hash.
await copyFile(
  new URL("../dist/index.html", import.meta.url),
  new URL("../dist/404.html", import.meta.url),
);
console.log("Created dist/404.html from the built application entry point.");
