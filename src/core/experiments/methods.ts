import type { BackendId } from "../backends/types";
import type {
  DebugViewDefinition,
  ExperimentDefinition,
  ExperimentMethodDefinition,
} from "./types";
import type { ExperimentParameters } from "../parameters/types";
import { matchesParameterConditions } from "../parameters/visibility";

export function getExperimentMethod<
  TParameters extends ExperimentParameters,
>(
  experiment: ExperimentDefinition<TParameters>,
  methodId: string,
): ExperimentMethodDefinition<TParameters> {
  const method = experiment.methods.find((candidate) => candidate.id === methodId);
  if (!method) {
    throw new Error(
      `Method "${methodId}" is not registered for ${experiment.metadata.title}.`,
    );
  }
  return method;
}

export function getExperimentSupportedBackends(
  experiment: ExperimentDefinition,
): BackendId[] {
  const backends = new Set<BackendId>();
  experiment.methods.forEach((method) => {
    method.supportedBackends.forEach((backend) => backends.add(backend));
  });
  return Array.from(backends);
}

export function groupExperimentMethods<
  TParameters extends ExperimentParameters,
>(experiment: ExperimentDefinition<TParameters>) {
  const groups = new Map<
    string,
    ExperimentMethodDefinition<TParameters>[]
  >();

  experiment.methods.forEach((method) => {
    const label = method.group ?? "";
    const methods = groups.get(label) ?? [];
    methods.push(method);
    groups.set(label, methods);
  });

  return Array.from(groups, ([label, methods]) => ({
    label: label || undefined,
    methods,
  }));
}

export function getMethodDebugViews(
  experiment: ExperimentDefinition,
  method: ExperimentMethodDefinition,
  parameters?: ExperimentParameters,
): DebugViewDefinition[] {
  const definitions = [...(experiment.debugViews ?? []), ...(method.debugViews ?? [])];
  return parameters
    ? definitions.filter((view) => !view.visibleWhen || matchesParameterConditions(view.visibleWhen, parameters))
    : definitions;
}

export function getMethodSupportedBackends(
  method: ExperimentMethodDefinition,
  parameters: ExperimentParameters,
): BackendId[] {
  return method.supportedBackends.filter((backend) => {
    const condition = method.backendConditions?.[backend];
    return !condition || matchesParameterConditions(condition, parameters);
  });
}
