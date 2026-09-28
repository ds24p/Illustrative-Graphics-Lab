import { useState } from "react";
import type { DebugView } from "../../core/results/types";
import type { DebugViewDefinition } from "../../core/experiments/types";
import type { ExperimentRendererMap } from "../../core/rendering/types";
import { ResultCanvas } from "./ResultCanvas";

interface DebugViewGalleryProps {
  views: DebugView[];
  renderers?: ExperimentRendererMap;
  definitions?: DebugViewDefinition[];
  selection?: { groupLabel: string; viewLabel: string; initialViewId?: string };
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

function SelectedDebugGallery({ views, renderers, definitions, selection }: DebugViewGalleryProps & { selection: NonNullable<DebugViewGalleryProps["selection"]> }) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedDefinition, setSelectedDefinition] = useState(selection.initialViewId ?? "");
  const groups = [...new Set(views.map((view) => view.group ?? ""))];
  const group = groups.includes(selectedGroup) ? selectedGroup : groups[0];
  const candidates = views.filter((view) => (view.group ?? "") === group);
  const view = candidates.find((candidate) => (candidate.definitionId ?? candidate.id) === selectedDefinition) ?? candidates[0];
  if (!view) return null;
  const description = definitions?.find((definition) => definition.id === (view.definitionId ?? view.id))?.description;
  return (
    <section className="debug-group">
      <div className="debug-selectors">
        <label className="field-group">
          <span className="field-label">{selection.groupLabel}</span>
          <select value={group} onChange={(event) => setSelectedGroup(event.target.value)}>
            {groups.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </label>
        <label className="field-group">
          <span className="field-label">{selection.viewLabel}</span>
          <select value={view.definitionId ?? view.id} onChange={(event) => setSelectedDefinition(event.target.value)}>
            {candidates.map((candidate) => <option key={candidate.id} value={candidate.definitionId ?? candidate.id}>{definitions?.find((definition) => definition.id === (candidate.definitionId ?? candidate.id))?.label ?? candidate.label}</option>)}
          </select>
        </label>
      </div>
      <DebugPanel view={view} renderers={renderers} description={description} />
    </section>
  );
}

export function DebugViewGallery({ views, renderers, definitions, selection }: DebugViewGalleryProps) {
  if (selection) return <SelectedDebugGallery views={views} renderers={renderers} definitions={definitions} selection={selection} />;
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
