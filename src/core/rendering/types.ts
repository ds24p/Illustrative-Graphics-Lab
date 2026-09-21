import type {
  ExperimentResult,
  ExperimentResultKind,
} from "../results/types";

export interface RenderTarget {
  canvas: HTMLCanvasElement;
}

export type ExperimentResultRenderer = (
  result: ExperimentResult,
  target: RenderTarget,
) => void;

export type ExperimentRendererMap = Partial<
  Record<ExperimentResultKind, ExperimentResultRenderer>
>;
