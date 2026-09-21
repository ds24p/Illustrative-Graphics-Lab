import { FlaskConical } from "lucide-react";
import type { ExperimentResult } from "../../core/results/types";
import type { ExperimentRendererMap } from "../../core/rendering/types";
import { ResultCanvas } from "./ResultCanvas";

interface OutputPanelProps {
  title: string;
  detail?: string;
  result?: ExperimentResult;
  renderers?: ExperimentRendererMap;
  label: string;
  emptyMessage: string;
  aspectRatio?: string;
}

export function OutputPanel({
  title,
  detail,
  result,
  renderers,
  label,
  emptyMessage,
  aspectRatio,
}: OutputPanelProps) {
  return (
    <figure className="image-panel">
      <figcaption>
        <span>{title}</span>
        {detail && <small>{detail}</small>}
      </figcaption>
      <div className="image-stage output-stage" style={{ aspectRatio }}>
        {result ? (
          <ResultCanvas result={result} renderers={renderers} label={label} />
        ) : (
          <div className="output-empty">
            <FlaskConical size={27} />
            <span>{emptyMessage}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
