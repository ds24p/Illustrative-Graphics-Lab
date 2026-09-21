import { useEffect, useState } from "react";
import {
  Clock3,
  Download,
  Play,
  RotateCcw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  BackendComparisonSummary,
  TimingStageList,
} from "../components/experiments/BackendComparisonSummary";
import { BackendSelector } from "../components/experiments/BackendSelector";
import { OutputPanel } from "../components/experiments/OutputPanel";
import { ParameterPanel } from "../components/experiments/ParameterPanel";
import { ResultCanvas } from "../components/experiments/ResultCanvas";
import { SourceChooser } from "../components/experiments/SourceChooser";
import { checkBackendAvailability } from "../core/backends/availability";
import type {
  BackendAvailability,
  BackendId,
} from "../core/backends/types";
import type {
  ExperimentDefinition,
  SampleImageDefinition,
} from "../core/experiments/types";
import {
  groupExperimentMethods,
  getExperimentMethod,
  getExperimentSupportedBackends,
  getMethodDebugViews,
} from "../core/experiments/methods";
import { compareCpuAndWebGpu } from "../core/execution/compareBackends";
import { runExperiment } from "../core/execution/runExperiment";
import type {
  BackendComparisonReport,
  ExperimentRunReport,
} from "../core/execution/types";
import { loadImageFile, loadImageSource } from "../core/images/loadImage";
import type { ImageSource } from "../core/images/types";
import type { ExperimentParameters } from "../core/parameters/types";
import { downloadResultAsPng } from "../core/rendering/downloadResult";
import { getExperiment } from "../experiments/registry";
import { NotFoundPage } from "./NotFoundPage";

interface ExperimentWorkspaceProps {
  experiment: ExperimentDefinition<ExperimentParameters>;
}

function ExperimentWorkspace({ experiment }: ExperimentWorkspaceProps) {
  const [parameters, setParameters] = useState<ExperimentParameters>({
    ...experiment.defaultParameters,
  });
  const [methodId, setMethodId] = useState(experiment.defaultMethodId);
  const initialMethod = getExperimentMethod(experiment, experiment.defaultMethodId);
  const [backend, setBackend] = useState<BackendId>(initialMethod.defaultBackend);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [source, setSource] = useState<ImageSource>();
  const [report, setReport] = useState<ExperimentRunReport>();
  const [comparison, setComparison] = useState<BackendComparisonReport>();
  const [compareMode, setCompareMode] = useState(false);
  const [backendAvailability, setBackendAvailability] = useState<
    Partial<Record<BackendId, BackendAvailability>>
  >({ cpu: { available: true } });
  const [loadingSource, setLoadingSource] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const method = getExperimentMethod(experiment, methodId);
  const parameterDefinitions = [
    ...experiment.parameters,
    ...(method.parameters ?? []),
  ];
  const debugViewDefinitions = getMethodDebugViews(experiment, method);
  const methodGroups = groupExperimentMethods(experiment);
  const experimentBackends = getExperimentSupportedBackends(experiment);
  const supportsBackendComparison =
    method.supportedBackends.includes("cpu") &&
    method.supportedBackends.includes("webgpu");
  const webGpuAvailable = backendAvailability.webgpu?.available === true;
  const previewAspectRatio = source
    ? `${source.imageData.width} / ${source.imageData.height}`
    : undefined;
  const previewStyle = source
    ? { aspectRatio: previewAspectRatio }
    : undefined;
  const displayedDebugViews = comparison
    ? comparison.webgpu.usedBackend === "webgpu"
      ? comparison.webgpu.debugViews
      : comparison.cpu.debugViews
    : (report?.debugViews ?? []);

  const clearResults = () => {
    setReport(undefined);
    setComparison(undefined);
  };

  useEffect(() => {
    let active = true;
    const checking: Partial<Record<BackendId, BackendAvailability>> = {};

    method.supportedBackends.forEach((id) => {
      checking[id] =
        id === "cpu"
          ? { available: true }
          : { available: false, reason: `Checking ${id.toUpperCase()} support...` };
    });
    setBackendAvailability(checking);

    void Promise.all(
      method.supportedBackends.map(async (id) => {
        const candidate = method.backends[id];
        const status = candidate
          ? await checkBackendAvailability(candidate)
          : { available: false, reason: `${id} is not implemented.` };
        return [id, status] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      const next: Partial<Record<BackendId, BackendAvailability>> = {};
      entries.forEach(([id, status]) => {
        next[id] = status;
      });
      setBackendAvailability(next);
    });

    return () => {
      active = false;
    };
  }, [method]);

  useEffect(() => {
    const status = backendAvailability[backend];
    if (status && !status.available) {
      setBackend(method.defaultBackend);
      setCompareMode(false);
    }
  }, [backend, backendAvailability, method.defaultBackend]);

  const selectSample = async (sample: SampleImageDefinition) => {
    setLoadingSource(true);
    setError(undefined);
    try {
      const loaded = await loadImageSource(sample.src, sample.label);
      setSource(loaded);
      clearResults();
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "The sample could not load.",
      );
    } finally {
      setLoadingSource(false);
    }
  };

  useEffect(() => {
    const firstSample = experiment.sampleImages[0];
    if (firstSample) void selectSample(firstSample);
    // The workspace is remounted for a different experiment id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiment.metadata.id]);

  const selectFile = async (file: File) => {
    setLoadingSource(true);
    setError(undefined);
    try {
      const loaded = await loadImageFile(file);
      setSource(loaded);
      clearResults();
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "The image could not load.",
      );
    } finally {
      setLoadingSource(false);
    }
  };

  const apply = async () => {
    if (!source) return;
    setRunning(true);
    setError(undefined);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      clearResults();
      if (compareMode) {
        setComparison(
          await compareCpuAndWebGpu(
            experiment,
            methodId,
            source,
            parameters,
            debugEnabled,
          ),
        );
      } else {
        setReport(
          await runExperiment(
            experiment,
            methodId,
            source,
            parameters,
            backend,
            debugEnabled,
          ),
        );
      }
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "The experiment failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  const updateParameters = (values: ExperimentParameters) => {
    setParameters(values);
    clearResults();
  };

  const resetParameters = () => {
    setParameters({ ...experiment.defaultParameters });
    clearResults();
  };

  const selectMethod = (nextMethodId: string) => {
    const nextMethod = getExperimentMethod(experiment, nextMethodId);
    setMethodId(nextMethodId);
    setBackend(nextMethod.defaultBackend);
    setDebugEnabled(false);
    setCompareMode(false);
    clearResults();
  };

  const download = async () => {
    const downloadableReport = comparison
      ? comparison.webgpu.usedBackend === "webgpu"
        ? comparison.webgpu
        : comparison.cpu
      : report;
    if (!downloadableReport) return;
    try {
      await downloadResultAsPng(
        downloadableReport.output,
        `${experiment.metadata.id}-result.png`,
        experiment.renderers,
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The result could not be downloaded.",
      );
    }
  };

  return (
    <div className="experiment-page">
      <header className="experiment-heading page-width">
        <div className="breadcrumbs">
          <Link to="/experiments">Experiments</Link>
          <span>/</span>
          <span>{experiment.metadata.title}</span>
        </div>
        <div className="experiment-title-row">
          <div>
            <span className="eyebrow">{experiment.metadata.category}</span>
            <h1>{experiment.metadata.title}</h1>
            <p>{experiment.metadata.summary}</p>
          </div>
          <div className="title-backends">
            {experimentBackends.map((id) => (
              <span key={id}>{id.toUpperCase()}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="workspace-shell page-width">
        <section className="workspace-main">
          <SourceChooser
            samples={experiment.sampleImages}
            source={source}
            loading={loadingSource}
            onSampleSelect={selectSample}
            onFileSelect={selectFile}
          />

          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className={`comparison-grid${comparison ? " is-comparing" : ""}`}>
            <figure className="image-panel">
              <figcaption>
                <span>Input</span>
                {source && (
                  <small>
                    {source.imageData.width} x {source.imageData.height}
                  </small>
                )}
              </figcaption>
              <div className="image-stage" style={previewStyle}>
                {source ? (
                  <img src={source.previewUrl} alt={`Input: ${source.name}`} />
                ) : (
                  <span>{loadingSource ? "Loading..." : "Choose an image"}</span>
                )}
              </div>
            </figure>

            {comparison ? (
              <>
                <OutputPanel
                  title="CPU result"
                  detail={comparison.cpu.output.kind}
                  result={comparison.cpu.output}
                  renderers={experiment.renderers}
                  label={`${experiment.metadata.title} CPU output`}
                  emptyMessage="Run the comparison to create a result."
                  aspectRatio={previewAspectRatio}
                />
                <OutputPanel
                  title="WebGPU result"
                  detail={
                    comparison.webgpu.usedBackend === "webgpu"
                      ? comparison.webgpu.output.kind
                      : "CPU fallback"
                  }
                  result={comparison.webgpu.output}
                  renderers={experiment.renderers}
                  label={`${experiment.metadata.title} WebGPU output`}
                  emptyMessage="Run the comparison to create a result."
                  aspectRatio={previewAspectRatio}
                />
              </>
            ) : (
              <OutputPanel
                title="Output"
                detail={report?.output.kind}
                result={report?.output}
                renderers={experiment.renderers}
                label={`${experiment.metadata.title} output`}
                emptyMessage={
                  compareMode
                    ? "Run the experiment to compare CPU and WebGPU."
                    : "Run the experiment to create a result."
                }
                aspectRatio={previewAspectRatio}
              />
            )}
          </div>

          {comparison && <BackendComparisonSummary report={comparison} />}

          {displayedDebugViews.map((debugView) => (
            <figure className="debug-panel" key={debugView.id}>
              <figcaption>
                <span>Debug visualization</span>
                <strong>{debugView.label}</strong>
              </figcaption>
              <div className="debug-canvas">
                <ResultCanvas
                  result={debugView.result}
                  renderers={experiment.renderers}
                  label={debugView.label}
                />
              </div>
            </figure>
          ))}
        </section>

        <aside className="control-panel">
          <div className="control-section">
            <div className="control-section-heading">
              <span>01</span>
              <h2>Parameters</h2>
            </div>
            <label className="field-group method-field">
              <span className="field-label">
                {experiment.methodSelection?.label ?? "Method"}
              </span>
              <select
                value={methodId}
                onChange={(event) => selectMethod(event.target.value)}
              >
                {methodGroups.map((group) =>
                  group.label ? (
                    <optgroup label={group.label} key={group.label}>
                      {group.methods.map((candidate) => (
                        <option value={candidate.id} key={candidate.id}>
                          {candidate.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    group.methods.map((candidate) => (
                      <option value={candidate.id} key={candidate.id}>
                        {candidate.label}
                      </option>
                    ))
                  ),
                )}
              </select>
              {method.group && (
                <span className="method-group-label">{method.group}</span>
              )}
              <small>
                {method.description ?? experiment.methodSelection?.description}
              </small>
            </label>
            <ParameterPanel
              definitions={parameterDefinitions}
              values={parameters}
              onChange={updateParameters}
            />
          </div>

          <div className="control-section">
            <div className="control-section-heading">
              <span>02</span>
              <h2>Execution</h2>
            </div>
            <BackendSelector
              supportedBackends={method.supportedBackends}
              value={backend}
              availability={backendAvailability}
              disabled={compareMode}
              onChange={(value) => {
                setBackend(value);
                clearResults();
              }}
            />
            {supportsBackendComparison && (
              <label
                className={`toggle-field compare-toggle${
                  webGpuAvailable ? "" : " is-disabled"
                }`}
              >
                <span>
                  <span className="field-label">Compare CPU and WebGPU</span>
                  <small>Run both backends and compare their raster pixels.</small>
                </span>
                <input
                  type="checkbox"
                  checked={compareMode}
                  disabled={!webGpuAvailable || running}
                  onChange={(event) => {
                    setCompareMode(event.target.checked);
                    clearResults();
                  }}
                />
                <span className="toggle-track" aria-hidden="true" />
              </label>
            )}
            {debugViewDefinitions.length > 0 && (
              <label className="toggle-field debug-toggle">
                <span>
                  <span className="field-label">Generate intermediate views</span>
                  <small>
                    {debugViewDefinitions.map((view) => view.label).join(", ")}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={debugEnabled}
                  onChange={(event) => {
                    setDebugEnabled(event.target.checked);
                    clearResults();
                  }}
                />
                <span className="toggle-track" aria-hidden="true" />
              </label>
            )}
          </div>

          <button
            className="button button-run"
            type="button"
            onClick={apply}
            disabled={!source || loadingSource || running}
          >
            <Play size={18} fill="currentColor" />
            {running
              ? "Processing..."
              : compareMode
                ? "Run comparison"
                : "Run experiment"}
          </button>

          <div className="secondary-actions">
            <button className="icon-text-button" type="button" onClick={resetParameters}>
              <RotateCcw size={17} /> Reset parameters
            </button>
            <button
              className="icon-text-button"
              type="button"
              onClick={download}
              disabled={!report && !comparison}
            >
              <Download size={17} /> Download PNG
            </button>
          </div>

          <div className="timing-panel" aria-live="polite">
            <Clock3 size={18} />
            <div>
              <span>Processing time</span>
              <strong>
                {comparison
                  ? "Comparison complete"
                  : report
                    ? `${report.timing.processingMs.toFixed(1)} ms`
                    : "Not run yet"}
              </strong>
              {report && (
                <>
                  <small>
                    {report.usedBackend.toUpperCase()} backend
                    {report.fallbackReason ? ` - ${report.fallbackReason}` : ""}
                  </small>
                  <TimingStageList stages={report.timing.stages} />
                </>
              )}
              {comparison && <small>See the breakdown beside the results.</small>}
            </div>
          </div>
        </aside>
      </div>

      <section className="description-band">
        <div className="page-width description-grid">
          <div>
            <span className="eyebrow">Algorithm notes</span>
            <h2>How it works</h2>
            <p>{experiment.description.overview}</p>
            {experiment.description.formula && (
              <code>{experiment.description.formula}</code>
            )}
          </div>
          <ol>
            {experiment.description.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

export function ExperimentPage() {
  const { experimentId } = useParams();
  const experiment = experimentId ? getExperiment(experimentId) : undefined;

  if (!experiment) return <NotFoundPage />;

  return <ExperimentWorkspace key={experiment.metadata.id} experiment={experiment} />;
}
