import type { ExperimentBackend } from "../../../../core/backends/types";
import { runThreshold } from "./algorithm.cpu";
import type { TemplateParameters } from "../../types";

export const thresholdCpuBackend: ExperimentBackend<TemplateParameters> = {
  id: "cpu",
  async run({ source, parameters, debugEnabled }) {
    return runThreshold(source.imageData, parameters, debugEnabled);
  },
};
