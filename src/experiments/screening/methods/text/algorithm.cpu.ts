import type { IntensityImage } from "../../types";
import { randomCharacterIndex } from "./random";
import type {
  CharacterCell,
  GlyphAtlas,
  TextScreeningResult,
} from "./types";

function validateSource(source: IntensityImage) {
  if (
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height) ||
    source.width < 1 ||
    source.height < 1 ||
    source.values.length !== source.width * source.height
  ) {
    throw new Error("The source intensity image is invalid.");
  }
}

function validateAtlas(atlas: GlyphAtlas) {
  if (
    !Number.isInteger(atlas.cellWidth) ||
    !Number.isInteger(atlas.cellHeight) ||
    atlas.cellWidth < 1 ||
    atlas.cellHeight < 1 ||
    atlas.characters.length < 1 ||
    atlas.levels.length < 1
  ) {
    throw new Error("The glyph atlas is invalid.");
  }

  for (const level of atlas.levels) {
    if (level.length !== atlas.characters.length) {
      throw new Error("Every glyph level must contain the full character set.");
    }
    for (const glyph of level) {
      if (
        glyph.width !== atlas.cellWidth ||
        glyph.height !== atlas.cellHeight ||
        glyph.values.length !== atlas.cellWidth * atlas.cellHeight
      ) {
        throw new Error("Every glyph must match the atlas cell dimensions.");
      }
    }
  }
}

export function averageCellIntensity(
  source: IntensityImage,
  blockX: number,
  blockY: number,
  cellWidth: number,
  cellHeight: number,
) {
  const endX = Math.min(source.width, blockX + cellWidth);
  const endY = Math.min(source.height, blockY + cellHeight);
  let sum = 0;
  let count = 0;

  for (let y = blockY; y < endY; y += 1) {
    for (let x = blockX; x < endX; x += 1) {
      sum += source.values[y * source.width + x];
      count += 1;
    }
  }

  if (count === 0) {
    throw new Error("A text screening cell must contain at least one pixel.");
  }
  return sum / count;
}

export function mapAverageToLevel(average: number, levelCount: number) {
  if (!Number.isInteger(levelCount) || levelCount < 1) {
    throw new Error("Text Screening requires at least one intensity level.");
  }
  return Math.max(
    0,
    Math.min(levelCount - 1, Math.round(average * (levelCount - 1))),
  );
}

export function screenWithText(
  source: IntensityImage,
  atlas: GlyphAtlas,
  seed: number,
  debugEnabled = false,
): TextScreeningResult {
  validateSource(source);
  validateAtlas(atlas);

  const output = new Float32Array(source.values.length);
  output.fill(1);
  const cells: CharacterCell[] | undefined = debugEnabled ? [] : undefined;
  const blockAverageMap = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;
  const levelMap = debugEnabled
    ? new Float32Array(source.values.length)
    : undefined;

  let cellRow = 0;
  for (let blockY = 0; blockY < source.height; blockY += atlas.cellHeight) {
    let cellColumn = 0;
    for (let blockX = 0; blockX < source.width; blockX += atlas.cellWidth) {
      const width = Math.min(atlas.cellWidth, source.width - blockX);
      const height = Math.min(atlas.cellHeight, source.height - blockY);
      const averageIntensity = averageCellIntensity(
        source,
        blockX,
        blockY,
        atlas.cellWidth,
        atlas.cellHeight,
      );
      const level = mapAverageToLevel(averageIntensity, atlas.levels.length);
      const characterIndex = randomCharacterIndex(
        cellColumn,
        cellRow,
        seed,
        atlas.characters.length,
      );
      const character = atlas.characters[characterIndex];
      const glyph = atlas.levels[level][characterIndex];

      cells?.push({
        x: blockX,
        y: blockY,
        width,
        height,
        averageIntensity,
        level,
        character,
        characterIndex,
      });

      for (let localY = 0; localY < height; localY += 1) {
        for (let localX = 0; localX < width; localX += 1) {
          const outputIndex =
            (blockY + localY) * source.width + blockX + localX;
          output[outputIndex] =
            glyph.values[localY * atlas.cellWidth + localX];
          if (blockAverageMap && levelMap) {
            blockAverageMap[outputIndex] = averageIntensity;
            levelMap[outputIndex] =
              atlas.levels.length === 1
                ? 0
                : level / (atlas.levels.length - 1);
          }
        }
      }

      cellColumn += 1;
    }
    cellRow += 1;
  }

  return {
    image: { width: source.width, height: source.height, values: output },
    cells,
    debug:
      blockAverageMap && levelMap
        ? {
            blockAverageMap,
            levelMap,
            selectedGlyphMap: new Float32Array(output),
          }
        : undefined,
  };
}
