import { TEXT_CELL_HEIGHT, TEXT_CELL_WIDTH } from "./atlas";
import type { GlyphAtlas, GlyphRaster } from "./types";

function scaledDimensions(width: number, height: number, scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error("Text Scale must be a positive finite number.");
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getTextCellDimensions(scale: number) {
  return scaledDimensions(TEXT_CELL_WIDTH, TEXT_CELL_HEIGHT, scale);
}

function resampleGlyph(glyph: GlyphRaster, width: number, height: number): GlyphRaster {
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) * glyph.height) / height - 0.5;
    const y0 = Math.max(0, Math.min(glyph.height - 1, Math.floor(sourceY)));
    const y1 = Math.min(glyph.height - 1, y0 + 1);
    const fractionY = Math.max(0, Math.min(1, sourceY - y0));
    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) * glyph.width) / width - 0.5;
      const x0 = Math.max(0, Math.min(glyph.width - 1, Math.floor(sourceX)));
      const x1 = Math.min(glyph.width - 1, x0 + 1);
      const fractionX = Math.max(0, Math.min(1, sourceX - x0));
      const top = glyph.values[y0 * glyph.width + x0] * (1 - fractionX) +
        glyph.values[y0 * glyph.width + x1] * fractionX;
      const bottom = glyph.values[y1 * glyph.width + x0] * (1 - fractionX) +
        glyph.values[y1 * glyph.width + x1] * fractionX;
      values[y * width + x] = top * (1 - fractionY) + bottom * fractionY;
    }
  }
  return { width, height, values };
}

export function scaleGlyphAtlas(atlas: GlyphAtlas, scale: number): GlyphAtlas {
  const { width, height } = scaledDimensions(
    atlas.cellWidth,
    atlas.cellHeight,
    scale,
  );
  if (width === atlas.cellWidth && height === atlas.cellHeight) return atlas;

  return {
    cellWidth: width,
    cellHeight: height,
    characters: atlas.characters,
    levels: atlas.levels.map((level) =>
      level.map((glyph) => resampleGlyph(glyph, width, height)),
    ),
  };
}
