import type { ExperimentBackend, BackendId } from "../backends/types";
import type { ExperimentParameters } from "../parameters/types";
import type { ParameterDefinition } from "../parameters/types";
import type { ExperimentRendererMap } from "../rendering/types";

export interface ExperimentMetadata {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
}

export interface ExperimentDescription {
  overview: string;
  steps: string[];
  formula?: string;
}

export interface SampleImageDefinition {
  id: string;
  label: string;
  src: string;
  alt: string;
}

export interface DebugViewDefinition {
  id: string;
  label: string;
  description: string;
}

export interface ExperimentMethodDefinition<
  TParameters extends ExperimentParameters = ExperimentParameters,
> {
  id: string;
  label: string;
  group?: string;
  description?: string;
  parameters?: ParameterDefinition[];
  supportedBackends: BackendId[];
  defaultBackend: BackendId;
  backends: Partial<Record<BackendId, ExperimentBackend<TParameters>>>;
  debugViews?: DebugViewDefinition[];
}

export interface ExperimentDefinition<
  TParameters extends ExperimentParameters = ExperimentParameters,
> {
  metadata: ExperimentMetadata;
  description: ExperimentDescription;
  parameters: ParameterDefinition[];
  defaultParameters: TParameters;
  sampleImages: SampleImageDefinition[];
  methods: ExperimentMethodDefinition<TParameters>[];
  defaultMethodId: string;
  methodSelection?: {
    label: string;
    description?: string;
  };
  debugViews?: DebugViewDefinition[];
  renderers?: ExperimentRendererMap;
}
