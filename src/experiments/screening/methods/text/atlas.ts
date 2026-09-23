import { loadImageSource } from "../../../../core/images/loadImage";
import glyphAtlasUrl from "../../assets/glyphs/text-screening-atlas.png";
import { processingBrightness } from "../../intensity";
import type { GlyphAtlas, GlyphRaster } from "./types";

export const TEXT_CELL_WIDTH = 8;
export const TEXT_CELL_HEIGHT = 14;
export const TEXT_LEVEL_COUNT = 8;
export const TEXT_CHARACTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

const ATLAS_WIDTH = TEXT_CELL_WIDTH * TEXT_CHARACTERS.length;
const ATLAS_HEIGHT = TEXT_CELL_HEIGHT * TEXT_LEVEL_COUNT;

function extractGlyph(
  imageData: ImageData,
  characterIndex: number,
  level: number,
): GlyphRaster {
  const values = new Float32Array(TEXT_CELL_WIDTH * TEXT_CELL_HEIGHT);
  const startX = characterIndex * TEXT_CELL_WIDTH;
  const startY = level * TEXT_CELL_HEIGHT;

  for (let y = 0; y < TEXT_CELL_HEIGHT; y += 1) {
    for (let x = 0; x < TEXT_CELL_WIDTH; x += 1) {
      const sourcePixel = ((startY + y) * imageData.width + startX + x) * 4;
      values[y * TEXT_CELL_WIDTH + x] = processingBrightness(
        imageData.data[sourcePixel],
        imageData.data[sourcePixel + 1],
        imageData.data[sourcePixel + 2],
      );
    }
  }

  return { width: TEXT_CELL_WIDTH, height: TEXT_CELL_HEIGHT, values };
}

async function decodeTextGlyphAtlas(): Promise<GlyphAtlas> {
  const source = await loadImageSource(glyphAtlasUrl, "Text Screening glyph atlas");
  const { imageData } = source;

  if (imageData.width !== ATLAS_WIDTH || imageData.height !== ATLAS_HEIGHT) {
    throw new Error(
      `Text Screening glyph atlas must be ${ATLAS_WIDTH} x ${ATLAS_HEIGHT} pixels.`,
    );
  }

  const levels = Array.from({ length: TEXT_LEVEL_COUNT }, (_, level) =>
    TEXT_CHARACTERS.map((_, characterIndex) =>
      extractGlyph(imageData, characterIndex, level),
    ),
  );

  return {
    cellWidth: TEXT_CELL_WIDTH,
    cellHeight: TEXT_CELL_HEIGHT,
    characters: [...TEXT_CHARACTERS],
    levels,
  };
}

let atlasPromise: Promise<GlyphAtlas> | undefined;

export function loadTextGlyphAtlas() {
  atlasPromise ??= decodeTextGlyphAtlas();
  return atlasPromise;
}
