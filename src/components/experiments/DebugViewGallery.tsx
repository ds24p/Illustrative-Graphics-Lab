import type { DebugView } from "../../core/results/types";
import type { ExperimentRendererMap } from "../../core/rendering/types";
import { ResultCanvas } from "./ResultCanvas";

interface DebugViewGalleryProps {
  views: DebugView[];
  renderers?: ExperimentRendererMap;
}

function DebugPanel({
  view,
  renderers,
}: {
  view: DebugView;
  renderers?: ExperimentRendererMap;
}) {
  return (
    <figure className="debug-panel">
      <figcaption>
        <span>Debug visualization</span>
        <strong>{view.label}</strong>
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

export function DebugViewGallery({ views, renderers }: DebugViewGalleryProps) {
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
            <DebugPanel key={view.id} view={view} renderers={renderers} />
          ))}
        </div>
      </section>
    ) : (
      <div className="debug-ungrouped" key="ungrouped">
        {groupViews.map((view) => (
          <DebugPanel key={view.id} view={view} renderers={renderers} />
        ))}
      </div>
    ),
  );
}
