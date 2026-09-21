export type ParameterValue = number | string | boolean | string[];
export type ExperimentParameters = Record<string, ParameterValue>;

export interface ParameterVisibilityCondition {
  parameter: string;
  equals?: ParameterValue;
  notEquals?: ParameterValue;
  oneOf?: ParameterValue[];
}

interface BaseParameterDefinition {
  key: string;
  label: string;
  description?: string;
  visibleWhen?:
    | ParameterVisibilityCondition
    | ParameterVisibilityCondition[];
}

export interface NumberParameterDefinition extends BaseParameterDefinition {
  kind: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface IntegerParameterDefinition extends BaseParameterDefinition {
  kind: "integer";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface RangeParameterDefinition extends BaseParameterDefinition {
  kind: "range";
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  format?: "number" | "percent";
}

export interface BooleanParameterDefinition extends BaseParameterDefinition {
  kind: "boolean";
  defaultValue: boolean;
}

export interface SelectParameterDefinition extends BaseParameterDefinition {
  kind: "select";
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}

export interface ColorParameterDefinition extends BaseParameterDefinition {
  kind: "color";
  defaultValue: string;
}

export interface ColorListParameterDefinition extends BaseParameterDefinition {
  kind: "color-list";
  defaultValue: string[];
  minItems?: number;
  maxItems?: number;
  defaultNewColor?: string;
}

export type ParameterDefinition =
  | NumberParameterDefinition
  | IntegerParameterDefinition
  | RangeParameterDefinition
  | BooleanParameterDefinition
  | SelectParameterDefinition
  | ColorParameterDefinition
  | ColorListParameterDefinition;
