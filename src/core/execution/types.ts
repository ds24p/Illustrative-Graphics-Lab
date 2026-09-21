import type { BackendId } from "../backends/types";
import type { DebugView, ExperimentResult } from "../results/types";
import type { RasterDifference } from "../results/compareRasterResults";

export interface ProcessingTiming {
  totalMs: number;
  processingMs: number;
  stages?: Record<string, number>;
}

export interface ExperimentRunReport {
  output: ExperimentResult;
  debugViews: DebugView[];
  requestedBackend: BackendId;
  usedBackend: BackendId;
  fallbackReason?: string;
  timing: ProcessingTiming;
}

export interface BackendComparisonReport {
  cpu: ExperimentRunReport;
  webgpu: ExperimentRunReport;
  difference?: RasterDifference;
  comparisonUnavailableReason?: string;
}
