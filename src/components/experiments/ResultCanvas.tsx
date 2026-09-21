import { useEffect, useRef, useState } from "react";
import type { ExperimentResult } from "../../core/results/types";
import type { ExperimentRendererMap } from "../../core/rendering/types";
import { renderExperimentResult } from "../../core/rendering/renderResult";

interface ResultCanvasProps {
  result: ExperimentResult;
  renderers?: ExperimentRendererMap;
  label: string;
}

export function ResultCanvas({ result, renderers, label }: ResultCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      renderExperimentResult(result, canvasRef.current, renderers);
      setError(undefined);
    } catch (renderError) {
      setError(
        renderError instanceof Error ? renderError.message : "Rendering failed.",
      );
    }
  }, [renderers, result]);

  if (error) return <div className="canvas-error">{error}</div>;

  return <canvas ref={canvasRef} aria-label={label} />;
}
