import { ArrowRight, Box, Cpu, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { ExperimentCard } from "../components/experiments/ExperimentCard";
import { experiments } from "../experiments/registry";

export function HomePage() {
  const heroExperiment = experiments.find(
    (experiment) => experiment.listingImage ?? experiment.sampleImages[0],
  );
  const heroSample = heroExperiment?.listingImage ?? heroExperiment?.sampleImages[0];
  const methodCount = experiments.reduce(
    (total, experiment) => total + experiment.methods.length,
    0,
  );
  const backendCount = new Set(
    experiments.flatMap((experiment) =>
      experiment.methods.flatMap((method) => method.supportedBackends),
    ),
  ).size;

  return (
    <div className="home-page">
      <section
        className="home-hero"
        style={
          heroSample ? { backgroundImage: `url(${heroSample.src})` } : undefined
        }
      >
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <span className="hero-kicker">Computer graphics portfolio + laboratory</span>
          <h1>Illustrative Graphics Lab</h1>
          <p>
            Explore image-processing and non-photorealistic rendering algorithms
            through interactive, measurable experiments.
          </p>
          <Link className="button button-primary" to="/experiments">
            Browse experiments <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="home-summary page-width" aria-label="Lab summary">
        <div>
          <Box size={20} />
          <strong>{experiments.length}</strong>
          <span>
            experiment {experiments.length === 1 ? "family" : "families"}
          </span>
        </div>
        <div>
          <Layers3 size={20} />
          <strong>{methodCount}</strong>
          <span>algorithm methods</span>
        </div>
        <div>
          <Cpu size={20} />
          <strong>{backendCount}</strong>
          <span>execution backends in use</span>
        </div>
      </section>

      <section className="section-block page-width">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Available now</span>
            <h2>Explore experiment families</h2>
          </div>
          <Link className="text-link" to="/experiments">
            Open the full gallery <ArrowRight size={17} />
          </Link>
        </div>
        <div className="experiment-grid">
          {experiments.map((experiment) => (
            <ExperimentCard
              experiment={experiment}
              key={experiment.metadata.id}
            />
          ))}
        </div>
        <div className="home-roadmap">
          <span className="eyebrow">Growing laboratory</span>
          <p>
            Screening, stippling, painterly rendering, and mosaic experiments
            will appear here automatically when they join the registry.
          </p>
        </div>
      </section>
    </div>
  );
}
