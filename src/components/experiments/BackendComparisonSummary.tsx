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
  const exact =
    report.difference?.differentPixels === 0 &&
    report.difference.maximumChannelDifference === 0;

  return (
    <section className="backend-comparison-report" aria-live="polite">
      <header>
        <div>
          <span className="eyebrow">Backend comparison</span>
          <h2>CPU and WebGPU</h2>
        </div>
        {report.difference && (
          <strong className={exact ? "comparison-match" : "comparison-mismatch"}>
            {exact ? "Exact match" : "Outputs differ"}
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
          <span>Pixel differences</span>
          {report.difference ? (
            <>
              <dl>
                <div>
                  <dt>Different pixels</dt>
                  <dd>{report.difference.differentPixels.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Maximum channel difference</dt>
                  <dd>{report.difference.maximumChannelDifference}</dd>
                </div>
              </dl>
              <small>{report.difference.totalPixels.toLocaleString()} pixels checked</small>
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
