import { ArrowUpRight, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExperimentDefinition } from "../../core/experiments/types";
import { getExperimentSupportedBackends } from "../../core/experiments/methods";
import type { ExperimentParameters } from "../../core/parameters/types";

interface ExperimentCardProps {
  experiment: ExperimentDefinition<ExperimentParameters>;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  const sample = experiment.listingImage ?? experiment.sampleImages[0];
  const backendCount = getExperimentSupportedBackends(experiment).length;

  return (
    <article className="experiment-card">
      {sample && (
        <img className="experiment-card-image" src={sample.src} alt={sample.alt} />
      )}
      <div className="experiment-card-body">
        <div className="eyebrow-row">
          <span>{experiment.metadata.category}</span>
          <span className="backend-chip">
            <Cpu size={13} /> {backendCount} {backendCount === 1 ? "backend" : "backends"}
          </span>
        </div>
        <h2>{experiment.metadata.title}</h2>
        <p>{experiment.metadata.summary}</p>
        <div className="tag-row" aria-label="Experiment tags">
          {experiment.metadata.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <Link className="text-link" to={`/experiments/${experiment.metadata.id}`}>
          Open experiment <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}
