import type { BackendComparisonReport } from "../../core/execution/types";

interface TimingStageListProps {
  stages?: Record<string, number>;
}

export function TimingStageList({ stages }: TimingStageListProps) {
  if (!stages) return null;

  return (
    <dl className="timing-stage-list">
      {Object.entries(stages).map(([label, duration]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{duration.toFixed(2)} ms</dd>
        </div>
      ))}
    </dl>
  );
}

function BackendTiming({
  title,
  report,
}: {
  title: string;
  report: BackendComparisonReport["cpu"];
}) {
  return (
    <div className="comparison-timing">
      <span>{title}</span>
      <strong>{report.timing.processingMs.toFixed(2)} ms</strong>
      <small>Backend execution total</small>
      <TimingStageList stages={report.timing.stages} />
    </div>
  );
}

export function BackendComparisonSummary({
  report,
}: {
  report: BackendComparisonReport;
}) {
  const { difference } = report;
  const exact = difference?.kind === "raster"
    ? difference.data.differentPixels === 0 && difference.data.maximumChannelDifference === 0
    : difference?.kind === "points"
      ? difference.data.firstCount === difference.data.secondCount && difference.data.maximumDisplacement === 0
      : false;
  const differencePercentage = difference?.kind === "raster"
    ? (difference.data.differentPixels / difference.data.totalPixels) * 100
    : undefined;

  return (
    <section className="backend-comparison-report" aria-live="polite">
      <header>
        <div>
          <span className="eyebrow">Backend comparison</span>
          <h2>CPU and WebGPU</h2>
        </div>
        {difference && (
          <strong className={exact ? "comparison-match" : "comparison-mismatch"}>
            {exact ? "Exact match" : difference.kind === "points" ? "Coordinates differ" : "Outputs differ"}
          </strong>
        )}
      </header>

      <div className="comparison-report-grid">
        <BackendTiming title="CPU" report={report.cpu} />
        <BackendTiming
          title={report.webgpu.usedBackend === "webgpu" ? "WebGPU" : "CPU fallback"}
          report={report.webgpu}
        />
        <div className="comparison-differences">
          <span>{difference?.kind === "points" ? "Point differences" : "Pixel differences"}</span>
          {difference?.kind === "raster" ? (
            <>
              <dl>
                <div>
                  <dt>Different pixels</dt>
                  <dd>{difference.data.differentPixels.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Maximum channel difference</dt>
                  <dd>{difference.data.maximumChannelDifference}</dd>
                </div>
                <div>
                  <dt>Difference rate</dt>
                  <dd>{differencePercentage?.toFixed(4)}%</dd>
                </div>
              </dl>
              <small>{difference.data.totalPixels.toLocaleString()} pixels checked</small>
            </>
          ) : difference?.kind === "points" ? (
            <>
              <dl>
                <div><dt>CPU points</dt><dd>{difference.data.firstCount.toLocaleString()}</dd></div>
                <div><dt>WebGPU points</dt><dd>{difference.data.secondCount.toLocaleString()}</dd></div>
                <div><dt>Mean displacement</dt><dd>{difference.data.meanDisplacement.toFixed(4)} px</dd></div>
                <div><dt>Maximum displacement</dt><dd>{difference.data.maximumDisplacement.toFixed(4)} px</dd></div>
              </dl>
              <small>{difference.data.pairedCount.toLocaleString()} ordered points compared</small>
            </>
          ) : (
            <p>{report.comparisonUnavailableReason}</p>
          )}
        </div>
      </div>

      {report.webgpu.usedBackend === "webgpu" && (
        <p className="comparison-note">
          WebGPU synchronization includes GPU compute and the buffer copy. These
          wall-clock stages are diagnostic timings, not a standalone GPU benchmark.
        </p>
      )}
    </section>
  );
}
