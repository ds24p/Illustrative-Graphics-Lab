export interface RasterResult {
  kind: "raster";
  imageData: ImageData;
}

export interface PointMark {
  x: number;
  y: number;
  radius?: number;
  color?: string;
  opacity?: number;
}

export interface PointResult {
  kind: "points";
  width: number;
  height: number;
  points: PointMark[];
  background?: string;
}

export interface LineMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  color?: string;
  opacity?: number;
}

export interface LineResult {
  kind: "lines";
  width: number;
  height: number;
  lines: LineMark[];
  background?: string;
}

export interface PathMark {
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
  width?: number;
  stroke?: string;
  fill?: string;
  opacity?: number;
}

export interface PathResult {
  kind: "paths";
  width: number;
  height: number;
  paths: PathMark[];
  background?: string;
}

export interface StrokeTexture {
  src: string;
  scale?: number;
  spacing?: number;
}

export interface StrokeMark {
  points: Array<{ x: number; y: number }>;
  width: number;
  color: string;
  opacity?: number;
  texture?: StrokeTexture;
}

export interface PolygonMark {
  points: Array<{ x: number; y: number }>;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface PolygonResult {
  kind: "polygons";
  width: number;
  height: number;
  polygons: PolygonMark[];
  background?: string;
}

export interface StrokeResult {
  kind: "strokes";
  width: number;
  height: number;
  strokes: StrokeMark[];
  background?: string;
}

export type ExperimentResult =
  | RasterResult
  | PointResult
  | LineResult
  | PathResult
  | StrokeResult
  | PolygonResult;

export type ExperimentResultKind = ExperimentResult["kind"];

export interface DebugView {
  id: string;
  label: string;
  result: ExperimentResult;
}

// Algorithms can return explanatory views without knowing anything about React.
export interface ExperimentOutput {
  output: ExperimentResult;
  debugViews?: DebugView[];
}
