import { ExperimentCard } from "../components/experiments/ExperimentCard";
import { experiments } from "../experiments/registry";

export function ExperimentsPage() {
  return (
    <div className="page-width listing-page">
      <header className="page-heading">
        <span className="eyebrow">Experiment registry</span>
        <h1>Experiments</h1>
        <p>
          Each entry packages its own metadata, parameters, samples, and backend
          implementations.
        </p>
      </header>
      <div className="experiment-grid">
        {experiments.map((experiment) => (
          <ExperimentCard
            experiment={experiment}
            key={experiment.metadata.id}
          />
        ))}
      </div>
    </div>
  );
}
