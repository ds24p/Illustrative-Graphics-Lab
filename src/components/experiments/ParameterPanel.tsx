import { useEffect, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { loadImageFile } from "../../core/images/loadImage";
import type { ImageSource } from "../../core/images/types";
import type {
  ExperimentParameters,
  ImageParameterDefinition,
  ImageSelectParameterDefinition,
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

function isImageSource(value: ParameterValue): value is ImageSource {
  return Boolean(
    value &&
      typeof value === "object" &&
      "imageData" in value &&
      "previewUrl" in value,
  );
}

interface ImageSelectFieldProps {
  definition: ImageSelectParameterDefinition;
  value: ParameterValue;
  values: ExperimentParameters;
  onChange: (value: string) => void;
}

function ImageSelectField({
  definition,
  value,
  values,
  onChange,
}: ImageSelectFieldProps) {
  const selectedValue = typeof value === "string" ? value : definition.defaultValue;
  const selected =
    definition.options.find((option) => option.value === selectedValue) ??
    definition.options[0];
  const [preview, setPreview] = useState<{
    selectedValue: string;
    values: ExperimentParameters;
    src: string;
    label: string;
  }>();

  useEffect(() => {
    if (!selected || !definition.resolvePreview) return;
    let active = true;
    void definition.resolvePreview(selectedValue, values).then((resolved) => {
      if (active) setPreview({ selectedValue, values, ...resolved });
    }).catch(() => {
      if (active) setPreview(undefined);
    });
    return () => { active = false; };
  }, [definition, selected, selectedValue, values]);

  const effectivePreview =
    preview?.selectedValue === selectedValue && preview.values === values
      ? preview
      : undefined;

  return (
    <label className="field-group">
      <span className="field-label">{definition.label}</span>
      <select
        value={selectedValue}
        onChange={(event) => onChange(event.target.value)}
      >
        {definition.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selected && (
        <span className="parameter-image-preview">
          <img
            src={effectivePreview?.src ?? selected.previewSrc}
            alt={effectivePreview ? `${selected.label} effective kernel` : selected.alt ?? `${selected.label} preview`}
          />
          <small>{effectivePreview?.label ?? `${selected.label} source`}</small>
        </span>
      )}
      {definition.description && <small>{definition.description}</small>}
    </label>
  );
}

interface ImageUploadFieldProps {
  definition: ImageParameterDefinition;
  value: ParameterValue;
  onChange: (value: ImageSource) => void;
}

function ImageUploadField({
  definition,
  value,
  onChange,
}: ImageUploadFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const source = isImageSource(value) ? value : undefined;

  const selectFile = async (file: File) => {
    setLoading(true);
    setError(undefined);
    try {
      const loaded = await loadImageFile(file, {
        acceptedMimeTypes: definition.acceptedMimeTypes,
        maxFileBytes: definition.maxFileBytes,
        maxSourceEdge: definition.maxSourceEdge,
        maxSourcePixels: definition.maxSourcePixels,
        resizeMaxEdge: definition.maxSourceEdge,
      });
      onChange(loaded);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "The image could not load.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="field-group">
      <span className="field-label">{definition.label}</span>
      {source && (
        <span className="parameter-image-preview">
          <img src={source.previewUrl} alt={`${source.name} preview`} />
          <small>
            {source.name} · {source.imageData.width} x {source.imageData.height}
          </small>
        </span>
      )}
      <label className="button button-secondary parameter-upload-button">
        <ImagePlus size={16} />
        {loading ? "Loading..." : source ? "Replace image" : "Upload image"}
        <input
          type="file"
          accept={definition.accept}
          disabled={loading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void selectFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <small className="parameter-error" role="alert">
          {error}
        </small>
      )}
      {definition.description && <small>{definition.description}</small>}
    </div>
  );
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
        const value = values[definition.key] ?? definition.defaultValue;

        if (definition.kind === "image-select") {
          return (
            <ImageSelectField
              key={definition.key}
              definition={definition}
              value={value}
              values={values}
              onChange={(nextValue) => update(definition.key, nextValue)}
            />
          );
        }

        if (definition.kind === "image") {
          return (
            <ImageUploadField
              key={definition.key}
              definition={definition}
              value={value}
              onChange={(nextValue) => update(definition.key, nextValue)}
            />
          );
        }

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
                  const enteredValue = Number(event.target.value);
                  let nextValue =
                    definition.kind === "integer"
                      ? Math.round(enteredValue)
                      : enteredValue;
                  if (definition.min !== undefined) {
                    nextValue = Math.max(definition.min, nextValue);
                  }
                  if (definition.max !== undefined) {
                    nextValue = Math.min(definition.max, nextValue);
                  }
                  update(definition.key, nextValue);
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
                <output>
                  {definition.formatValue?.(numberValue) ??
                    displayNumber(numberValue, definition.format)}
                </output>
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
