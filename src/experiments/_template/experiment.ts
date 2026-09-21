import type { ExperimentDefinition } from "../../core/experiments/types";
import { posterizeCpuBackend } from "./methods/posterize/backend.cpu";
import { thresholdCpuBackend } from "./methods/threshold/backend.cpu";
import {
  posterizeParameters,
  sharedParameters,
  thresholdParameters,
} from "./parameters";
import type { TemplateParameters } from "./types";

// Copy this folder and rename the exported definition for a real family.
export const templateExperiment: ExperimentDefinition<TemplateParameters> = {
  metadata: {
    id: "template-family",
    title: "Template Family",
    summary: "A copyable example with shared controls and two CPU methods.",
    category: "Template",
    tags: ["template", "raster"],
  },
  description: {
    overview:
      "Replace this text with the idea shared by every method in the family.",
    steps: [
      "Prepare the source data.",
      "Run the selected method.",
      "Return a typed experiment result.",
    ],
  },
  parameters: sharedParameters,
  defaultParameters: {
    colorMode: "black-white",
    intensity: 1,
    gamma: 1,
    preserveAlpha: true,
    inkColor: "#111111",
    threshold: 128,
    invert: false,
    levels: 4,
    channelBias: 0,
  },
  sampleImages: [],
  methodSelection: {
    label: "Method",
    description: "Each method can expose its own parameters and backends.",
  },
  defaultMethodId: "threshold",
  methods: [
    {
      id: "threshold",
      label: "Threshold",
      description: "A first method with threshold-specific controls.",
      parameters: thresholdParameters,
      debugViews: [
        {
          id: "luminance-map",
          label: "Luminance map",
          description: "The source reduced to one perceived-brightness channel.",
        },
        {
          id: "threshold-mask",
          label: "Threshold mask",
          description: "The binary decision made before the final styling.",
        },
      ],
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: thresholdCpuBackend },
    },
    {
      id: "posterize",
      label: "Posterize",
      description: "A second method with a different parameter set.",
      parameters: posterizeParameters,
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: posterizeCpuBackend },
    },
  ],
};
