import type { ExperimentBackend } from "../../../../core/backends/types";
import { runPosterize } from "./algorithm.cpu";
import type { TemplateParameters } from "../../types";

export const posterizeCpuBackend: ExperimentBackend<TemplateParameters> = {
  id: "cpu",
  async run({ source, parameters }) {
    return { output: runPosterize(source.imageData, parameters) };
  },
};
