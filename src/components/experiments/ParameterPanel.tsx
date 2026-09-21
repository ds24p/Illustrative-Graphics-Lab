import { Plus, Trash2 } from "lucide-react";
import type {
  ExperimentParameters,
  ParameterDefinition,
  ParameterValue,
} from "../../core/parameters/types";
import { isParameterVisible } from "../../core/parameters/visibility";

interface ParameterPanelProps {
  definitions: ParameterDefinition[];
  values: ExperimentParameters;
  onChange: (values: ExperimentParameters) => void;
}

function displayNumber(value: number, format?: "number" | "percent") {
  return format === "percent" ? `${Math.round(value * 100)}%` : String(value);
}

export function ParameterPanel({
  definitions,
  values,
  onChange,
}: ParameterPanelProps) {
  const update = (key: string, value: ParameterValue) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="parameter-list">
      {definitions.filter((definition) => isParameterVisible(definition, values)).map((definition) => {
        const value = values[definition.key];

        if (definition.kind === "color-list") {
          const colors = Array.isArray(value) ? value : definition.defaultValue;
          const minimum = definition.minItems ?? 1;
          const maximum = definition.maxItems ?? 16;

          return (
            <div className="field-group" key={definition.key}>
              <span className="field-label">{definition.label}</span>
              <div className="color-list">
                {colors.map((color, index) => (
                  <div className="color-list-row" key={`${index}-${color}`}>
                    <input
                      type="color"
                      value={color}
                      aria-label={`${definition.label} color ${index + 1}`}
                      onChange={(event) => {
                        const nextColors = [...colors];
                        nextColors[index] = event.target.value;
                        update(definition.key, nextColors);
                      }}
                    />
                    <code>{color.toUpperCase()}</code>
                    <button
                      className="palette-remove-button"
                      type="button"
                      aria-label={`Remove color ${index + 1}`}
                      title={`Remove color ${index + 1}`}
                      disabled={colors.length <= minimum}
                      onClick={() =>
                        update(
                          definition.key,
                          colors.filter((_, colorIndex) => colorIndex !== index),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="color-list-add"
                type="button"
                disabled={colors.length >= maximum}
                onClick={() =>
                  update(definition.key, [
                    ...colors,
                    definition.defaultNewColor ?? "#000000",
                  ])
                }
              >
                <Plus size={16} /> Add color
              </button>
              {definition.description && <small>{definition.description}</small>}
            </div>
          );
        }

        if (definition.kind === "select") {
          return (
            <label className="field-group" key={definition.key}>
              <span className="field-label">{definition.label}</span>
              <select
                value={String(value)}
                onChange={(event) => update(definition.key, event.target.value)}
              >
                {definition.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {definition.description && <small>{definition.description}</small>}
            </label>
          );
        }

        if (definition.kind === "number" || definition.kind === "integer") {
          return (
            <label className="field-group" key={definition.key}>
              <span className="field-label">{definition.label}</span>
              <input
                className="number-input"
                type="number"
                min={definition.min}
                max={definition.max}
                step={definition.kind === "integer" ? definition.step ?? 1 : definition.step}
                value={Number(value)}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  update(
                    definition.key,
                    definition.kind === "integer"
                      ? Math.round(nextValue)
                      : nextValue,
                  );
                }}
              />
              {definition.description && <small>{definition.description}</small>}
            </label>
          );
        }

        if (definition.kind === "range") {
          const numberValue = Number(value);
          return (
            <label className="field-group" key={definition.key}>
              <span className="field-label field-label-split">
                {definition.label}
                <output>{displayNumber(numberValue, definition.format)}</output>
              </span>
              <input
                type="range"
                min={definition.min}
                max={definition.max}
                step={definition.step}
                value={numberValue}
                onChange={(event) =>
                  update(definition.key, Number(event.target.value))
                }
              />
              {definition.description && <small>{definition.description}</small>}
            </label>
          );
        }

        if (definition.kind === "boolean") {
          return (
            <label className="toggle-field" key={definition.key}>
              <span>
                <span className="field-label">{definition.label}</span>
                {definition.description && <small>{definition.description}</small>}
              </span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => update(definition.key, event.target.checked)}
              />
              <span className="toggle-track" aria-hidden="true" />
            </label>
          );
        }

        return (
          <label className="field-group" key={definition.key}>
            <span className="field-label">{definition.label}</span>
            <input
              type="color"
              value={String(value)}
              onChange={(event) => update(definition.key, event.target.value)}
            />
          </label>
        );
      })}
    </div>
  );
}
