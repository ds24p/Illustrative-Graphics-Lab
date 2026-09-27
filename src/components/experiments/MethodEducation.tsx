import type {
  ExperimentDescription,
  MethodEducationalContentDefinition,
} from "../../core/experiments/types";
import { resolveMethodEducationalContent } from "../../core/experiments/education";
import type { ExperimentParameters } from "../../core/parameters/types";
import { ChevronDown } from "lucide-react";

interface MethodEducationProps {
  methodLabel: string;
  content?: MethodEducationalContentDefinition;
  parameters: ExperimentParameters;
  fallback: ExperimentDescription;
}

export function MethodEducation({
  methodLabel,
  content,
  parameters,
  fallback,
}: MethodEducationProps) {
  const resolved = resolveMethodEducationalContent(content, parameters);

  if (!resolved) {
    return (
      <section className="description-band">
        <div className="page-width description-grid">
          <div>
            <span className="eyebrow">Algorithm notes</span>
            <h2>How it works</h2>
            <p>{fallback.overview}</p>
            {fallback.formula && <code>{fallback.formula}</code>}
          </div>
          <ol>
            {fallback.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const educationBody = (
    <div className="education-grid">
      <div className="education-column">
        <section className="education-section">
          <h3>How it works</h3>
          <ol>
            {resolved.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        {resolved.mathematics && resolved.mathematics.length > 0 && (
          <section className="education-section education-math">
            <h3>Mathematics</h3>
            {resolved.mathematics.map((block, index) => (
              <div className="math-block" key={`${block.label ?? "math"}-${index}`}>
                {block.label && <h4>{block.label}</h4>}
                {block.expressions.map((expression) => (
                  <code key={expression}>{expression}</code>
                ))}
                {block.explanation && <p>{block.explanation}</p>}
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="education-column">
        {resolved.parameters && resolved.parameters.length > 0 && (
          <section className="education-section">
            <h3>Parameters</h3>
            <dl className="education-definitions">
              {resolved.parameters.map((parameter) => (
                <div key={parameter.name}>
                  <dt>{parameter.name}</dt>
                  <dd>{parameter.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="education-section">
          <h3>Characteristics</h3>
          <ul className="education-list">
            {resolved.characteristics.map((characteristic) => (
              <li key={characteristic}>{characteristic}</li>
            ))}
          </ul>
        </section>

        <section className="education-section">
          <h3>Execution</h3>
          <dl className="education-definitions computation-notes">
            <div>
              <dt>CPU</dt>
              <dd>{resolved.computation.cpu}</dd>
            </div>
            {resolved.computation.worker && (
              <div>
                <dt>Web Worker</dt>
                <dd>{resolved.computation.worker}</dd>
              </div>
            )}
            <div>
              <dt>WebGPU</dt>
              <dd>{resolved.computation.gpu}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );

  return (
    <section className={`description-band method-education${resolved.collapseDetails ? " is-collapsible" : ""}`}>
      <div className="page-width">
        <header className="education-intro">
          <span className="eyebrow">About this method</span>
          <h2>{resolved.title ?? methodLabel}</h2>
          <p>{resolved.summary}</p>
        </header>
        {resolved.collapseDetails ? (
          <details className="education-disclosure">
            <summary>How it works, mathematics, and execution <ChevronDown size={18} aria-hidden="true" /></summary>
            {educationBody}
          </details>
        ) : educationBody}
      </div>
    </section>
  );
}
