import type { ExperimentDefinition } from "../core/experiments/types";
import type { ExperimentParameters } from "../core/parameters/types";
import { ditheringExperiment } from "./dithering";
import { grayscaleExperiment } from "./grayscale";

// The registry is the only shared file that changes when an experiment is added.
export const experiments: ExperimentDefinition<ExperimentParameters>[] = [
  grayscaleExperiment as ExperimentDefinition<ExperimentParameters>,
  ditheringExperiment as ExperimentDefinition<ExperimentParameters>,
];

export function getExperiment(id: string) {
  return experiments.find((experiment) => experiment.metadata.id === id);
}
