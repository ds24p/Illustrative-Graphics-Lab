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
      educationalContent: {
        summary:
          "Explain the method's goal and the visual effect it produces.",
        steps: [
          "Describe source preparation.",
          "Describe the central algorithmic decision.",
          "Describe how the result is produced.",
        ],
        mathematics: [
          {
            label: "Decision rule",
            expressions: ["output = 1 if value >= threshold; otherwise 0"],
            explanation: "Include mathematics only when it clarifies the method.",
          },
        ],
        parameters: [
          {
            name: "Threshold",
            description:
              "Explain how changing the value affects the output, not just its type or range.",
          },
        ],
        characteristics: [
          "State whether the method is deterministic and pixel-independent.",
          "Name the natural result representation.",
        ],
        computation: {
          cpu: "Describe the CPU work and important dependencies.",
          gpu: "Explain why the method is or is not suitable for WebGPU.",
        },
      },
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
      educationalContent: {
        summary: "Replace this with a concise explanation of posterization.",
        steps: ["Calculate a level index.", "Write the selected level."],
        parameters: [
          {
            name: "Levels",
            description: "Explain how the level count changes tonal banding.",
          },
        ],
        characteristics: ["Deterministic and pixel-independent."],
        computation: {
          cpu: "Constant work per pixel.",
          gpu: "Independent pixels make this suitable for parallel execution.",
        },
      },
      parameters: posterizeParameters,
      supportedBackends: ["cpu"],
      defaultBackend: "cpu",
      backends: { cpu: posterizeCpuBackend },
    },
  ],
};
