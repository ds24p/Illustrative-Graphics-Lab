import type { ExperimentParameters } from "../parameters/types";
import { matchesParameterConditions } from "../parameters/visibility";
import type {
  MethodEducationalContent,
  MethodEducationalContentDefinition,
} from "./types";

export function resolveMethodEducationalContent(
  definition: MethodEducationalContentDefinition | undefined,
  parameters: ExperimentParameters,
): MethodEducationalContent | undefined {
  if (!definition) return undefined;
  if (!("variants" in definition)) return definition;

  return definition.variants.find((variant) =>
    matchesParameterConditions(variant.when, parameters),
  )?.content;
}
