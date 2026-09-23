import type { ScalarField } from "../../types";

export interface GlyphRaster {
  width: number;
  height: number;
  values: Float32Array;
}

export interface GlyphAtlas {
  cellWidth: number;
  cellHeight: number;
  characters: string[];
  levels: GlyphRaster[][];
}

export interface CharacterCell {
  x: number;
  y: number;
  width: number;
  height: number;
  averageIntensity: number;
  level: number;
  character: string;
  characterIndex: number;
}

export interface TextScreeningDebugData {
  blockAverageMap: Float32Array;
  levelMap: Float32Array;
  selectedGlyphMap: Float32Array;
}

export interface TextScreeningResult {
  image: ScalarField;
  cells?: CharacterCell[];
  debug?: TextScreeningDebugData;
}
