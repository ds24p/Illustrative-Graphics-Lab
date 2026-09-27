import type { ExperimentBackend, BackendId } from "../backends/types";
import type { ExperimentParameters } from "../parameters/types";
import type { ParameterDefinition } from "../parameters/types";
import type { ParameterVisibilityRule } from "../parameters/types";
import type { ExperimentRendererMap } from "../rendering/types";
import type { ImageSource } from "../images/types";

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
  group?: string;
  visibleWhen?: ParameterVisibilityRule;
}

export interface EducationalMathBlock {
  label?: string;
  expressions: string[];
  explanation?: string;
}

export interface EducationalParameterNote {
  name: string;
  description: string;
}

export interface MethodEducationalContent {
  title?: string;
  summary: string;
  executionSummary?: string;
  collapseDetails?: boolean;
  steps: string[];
  mathematics?: EducationalMathBlock[];
  parameters?: EducationalParameterNote[];
  characteristics: string[];
  computation: {
    cpu: string;
    worker?: string;
    gpu: string;
  };
}

export interface MethodEducationalVariant {
  when: ParameterVisibilityRule;
  content: MethodEducationalContent;
}

export type MethodEducationalContentDefinition =
  | MethodEducationalContent
  | { variants: MethodEducationalVariant[] };

export interface ExperimentMethodDefinition<
  TParameters extends ExperimentParameters = ExperimentParameters,
> {
  id: string;
  label: string;
  group?: string;
  description?: string;
  educationalContent?: MethodEducationalContentDefinition;
  parameters?: ParameterDefinition[];
  // Overrides family defaults only for the selected method.
  defaultParameters?: ExperimentParameters;
  supportedBackends: BackendId[];
  // A family method can expose an execution backend only for selected strategies.
  backendConditions?: Partial<Record<BackendId, ParameterVisibilityRule>>;
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
  sourceParameterDefaults?: (source: ImageSource) => Partial<TParameters>;
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
