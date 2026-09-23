import type {
  ExperimentParameters,
  ParameterDefinition,
  ParameterVisibilityCondition,
  ParameterVisibilityRule,
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

  return matchesParameterConditions(definition.visibleWhen, values);
}

export function matchesParameterConditions(
  rule: ParameterVisibilityRule,
  values: ExperimentParameters,
) {
  const conditions = Array.isArray(rule) ? rule : [rule];

  return conditions.every((condition) => matchesCondition(condition, values));
}
