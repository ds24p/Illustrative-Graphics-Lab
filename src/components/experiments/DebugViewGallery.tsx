import type { DebugView } from "../../core/results/types";
import type { DebugViewDefinition } from "../../core/experiments/types";
import type { ExperimentRendererMap } from "../../core/rendering/types";
import { ResultCanvas } from "./ResultCanvas";

interface DebugViewGalleryProps {
  views: DebugView[];
  renderers?: ExperimentRendererMap;
  definitions?: DebugViewDefinition[];
}

function DebugPanel({
  view,
  renderers,
  description,
}: {
  view: DebugView;
  renderers?: ExperimentRendererMap;
  description?: string;
}) {
  return (
    <figure className="debug-panel">
      <figcaption>
        <span>Debug visualization</span>
        <strong>{view.label}</strong>
        {description && <small>{description}</small>}
      </figcaption>
      <div className="debug-canvas">
        <ResultCanvas
          result={view.result}
          renderers={renderers}
          label={view.label}
        />
      </div>
    </figure>
  );
}

export function DebugViewGallery({ views, renderers, definitions }: DebugViewGalleryProps) {
  const descriptions = new Map(definitions?.map(({ id, description }) => [id, description]));
  const groups = new Map<string, DebugView[]>();
  views.forEach((view) => {
    const key = view.group ?? "";
    const groupViews = groups.get(key) ?? [];
    groupViews.push(view);
    groups.set(key, groupViews);
  });

  return Array.from(groups, ([group, groupViews]) =>
    group ? (
      <section className="debug-group" key={group}>
        <header className="debug-group-heading">
          <span>Intermediate views</span>
          <h2>{group}</h2>
        </header>
        <div className="debug-group-grid">
          {groupViews.map((view) => (
            <DebugPanel key={view.id} view={view} renderers={renderers} description={descriptions.get(view.id)} />
          ))}
        </div>
      </section>
    ) : (
      <div className="debug-ungrouped" key="ungrouped">
        {groupViews.map((view) => (
          <DebugPanel key={view.id} view={view} renderers={renderers} description={descriptions.get(view.id)} />
        ))}
      </div>
    ),
  );
}
