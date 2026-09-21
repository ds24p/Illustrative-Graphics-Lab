import type {
  ExperimentParameters,
  ParameterDefinition,
  ParameterVisibilityCondition,
} from "./types";

function matchesCondition(
  condition: ParameterVisibilityCondition,
  values: ExperimentParameters,
) {
  const value = values[condition.parameter];

  if (condition.equals !== undefined && value !== condition.equals) return false;
  if (condition.notEquals !== undefined && value === condition.notEquals) {
    return false;
  }
  if (condition.oneOf && !condition.oneOf.includes(value)) return false;

  return true;
}

export function isParameterVisible(
  definition: ParameterDefinition,
  values: ExperimentParameters,
) {
  if (!definition.visibleWhen) return true;

  const conditions = Array.isArray(definition.visibleWhen)
    ? definition.visibleWhen
    : [definition.visibleWhen];

  return conditions.every((condition) => matchesCondition(condition, values));
}
