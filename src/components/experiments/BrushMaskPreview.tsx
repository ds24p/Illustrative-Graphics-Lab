import { useEffect, useMemo, useRef } from "react";
import { getBrushMask, brushTypeLabel, type BrushType } from "../../experiments/painterly-rendering/brushes";
import type { ImageSource } from "../../core/images/types";

interface BrushMaskPreviewProps {
  brushType: BrushType;
  seed: number;
  customBrush?: ImageSource | null;
}

const descriptions: Record<BrushType, string> = {
  soft: "Smooth radial coverage with soft edges.",
  flat: "Mostly uniform coverage with a defined boundary.",
  bristle: "Coherent longitudinal fiber bands follow the stroke.",
  dry: "Broken coverage with coherent gaps and missing paint.",
  rough: "Mostly continuous granular coverage with irregular edges.",
  custom: "Uploaded alpha or luminance converted to normalized coverage.",
};

export function BrushMaskPreview({ brushType, seed, customBrush }: BrushMaskPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mask = useMemo(() => getBrushMask(brushType, seed, customBrush), [brushType, seed, customBrush]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const pixels = new Uint8ClampedArray(mask.width * mask.height * 4);
    for (let i = 0; i < mask.data.length; i++) {
      const shade = Math.round(mask.data[i] * 255);
      pixels[i * 4] = shade;
      pixels[i * 4 + 1] = shade;
      pixels[i * 4 + 2] = shade;
      pixels[i * 4 + 3] = 255;
    }
    context.putImageData(new ImageData(pixels, mask.width, mask.height), 0, 0);
  }, [mask]);

  return (
    <div className="brush-mask-preview">
      <div className="brush-mask-preview-heading">
        <span className="field-label">Brush Mask</span>
        <strong>{brushTypeLabel(brushType)}</strong>
      </div>
      <canvas ref={canvasRef} aria-label={`${brushTypeLabel(brushType)} brush mask preview`} />
      <small>Black = M 0, white = M 1. {descriptions[brushType]}</small>
    </div>
  );
}
