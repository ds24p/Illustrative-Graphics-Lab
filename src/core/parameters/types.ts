import type { ImageSource } from "../images/types";

export type ParameterValue =
  | number
  | string
  | boolean
  | string[]
  | ImageSource
  | null;
export type ExperimentParameters = Record<string, ParameterValue>;

export interface ParameterVisibilityCondition {
  parameter: string;
  equals?: ParameterValue;
  notEquals?: ParameterValue;
  oneOf?: ParameterValue[];
}

export type ParameterVisibilityRule =
  | ParameterVisibilityCondition
  | ParameterVisibilityCondition[];

interface BaseParameterDefinition {
  key: string;
  label: string;
  description?: string;
  visibleWhen?: ParameterVisibilityRule;
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
  formatValue?: (value: number) => string;
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

export interface ImageSelectParameterDefinition
  extends BaseParameterDefinition {
  kind: "image-select";
  defaultValue: string;
  resolvePreview?: (
    selectedValue: string,
    values: ExperimentParameters,
  ) => Promise<{ src: string; label: string }>;
  options: Array<{
    value: string;
    label: string;
    previewSrc: string;
    alt?: string;
  }>;
}

export interface ImageParameterDefinition extends BaseParameterDefinition {
  kind: "image";
  defaultValue: ImageSource | null;
  accept?: string;
  acceptedMimeTypes?: string[];
  maxFileBytes?: number;
  maxSourceEdge?: number;
  maxSourcePixels?: number;
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
  | ImageSelectParameterDefinition
  | ImageParameterDefinition
  | ColorParameterDefinition
  | ColorListParameterDefinition;
