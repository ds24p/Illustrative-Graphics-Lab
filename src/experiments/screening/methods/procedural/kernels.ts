import type { ProceduralKernel } from "../../types";

export const doubleSidedRampKernel: ProceduralKernel = (s) => {
  return s <= 0.5 ? 2 * s : 2 - 2 * s;
};

export const crossKernel: ProceduralKernel = (s, t, parameters) => {
  const { I } = parameters;
  return s <= I ? I * t : (1 - I) * s + I;
};
