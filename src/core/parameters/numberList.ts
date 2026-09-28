import type { NumberListParameterDefinition } from "./types";

// Keep editable text in parameter state; normalize identically in the UI and backend.
export function normalizeNumberList(value: string, definition: Pick<NumberListParameterDefinition, "label" | "min" | "max" | "maxItems">): number[] {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${definition.label}: enter at least one number.`);
  const tokens = value.trim().split(/[\s,]+/).filter(Boolean);
  const numbers = tokens.map(Number);
  if (!numbers.length || numbers.some((number) => !Number.isInteger(number) || number < definition.min || number > definition.max)) {
    throw new Error(`${definition.label}: use whole numbers from ${definition.min} to ${definition.max}.`);
  }
  const normalized = [...new Set(numbers)].sort((a, b) => b - a);
  if (normalized.length > definition.maxItems) throw new Error(`${definition.label}: use at most ${definition.maxItems} distinct values.`);
  return normalized;
}
