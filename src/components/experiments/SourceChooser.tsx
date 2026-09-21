import { ImagePlus } from "lucide-react";
import type { SampleImageDefinition } from "../../core/experiments/types";
import type { ImageSource } from "../../core/images/types";

interface SourceChooserProps {
  samples: SampleImageDefinition[];
  source?: ImageSource;
  loading: boolean;
  onSampleSelect: (sample: SampleImageDefinition) => void;
  onFileSelect: (file: File) => void;
}

export function SourceChooser({
  samples,
  source,
  loading,
  onSampleSelect,
  onFileSelect,
}: SourceChooserProps) {
  return (
    <div className="source-chooser">
      <div>
        <span className="field-label">Source image</span>
        <p className="source-name">{loading ? "Loading image..." : source?.name}</p>
      </div>
      <div className="source-actions">
        {samples.map((sample) => (
          <button
            className="button button-secondary"
            type="button"
            key={sample.id}
            onClick={() => onSampleSelect(sample)}
            disabled={loading}
          >
            {sample.label}
          </button>
        ))}
        <label className="button button-secondary upload-button">
          <ImagePlus size={17} />
          Upload image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileSelect(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
