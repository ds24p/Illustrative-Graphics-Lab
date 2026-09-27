import type { BackendId } from "../backends/types";
import type { DebugView, ExperimentResult, ResultStatistic } from "../results/types";
import type { RasterDifference } from "../results/compareRasterResults";
import type { PointDifference } from "../results/comparePointResults";

export interface ProcessingTiming {
  totalMs: number;
  processingMs: number;
  stages?: Record<string, number>;
}

export interface ExperimentRunReport {
  output: ExperimentResult;
  debugViews: DebugView[];
  statistics?: ResultStatistic[];
  requestedBackend: BackendId;
  usedBackend: BackendId;
  fallbackReason?: string;
  timing: ProcessingTiming;
}

export interface BackendComparisonReport {
  cpu: ExperimentRunReport;
  webgpu: ExperimentRunReport;
  difference?: { kind: "raster"; data: RasterDifference } | { kind: "points"; data: PointDifference };
  comparisonUnavailableReason?: string;
}
