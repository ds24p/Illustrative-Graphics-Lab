import type { WebGpuExperimentBackend } from "../../../../core/backends/types";
import shaderSource from "./shader.wgsl?raw";
import type { TemplateParameters } from "../../types";

// This intentionally unregistered backend documents the future WebGPU shape.
export const posterizeWebGpuExample: WebGpuExperimentBackend<TemplateParameters> = {
  id: "webgpu",
  shaderSource,
  async checkAvailability() {
    return {
      available: false,
      reason: "Replace this template placeholder with a real WebGPU backend.",
    };
  },
  async run() {
    throw new Error("The template WebGPU backend is not implemented.");
  },
};
