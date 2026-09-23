import { Cpu, RotateCcw } from "lucide-react";
import { backendCatalog } from "../../core/backends/catalog";
import type {
  BackendAvailability,
  BackendId,
} from "../../core/backends/types";

interface BackendSelectorProps {
  supportedBackends: BackendId[];
  value: BackendId;
  onChange: (backend: BackendId) => void;
  availability?: Partial<Record<BackendId, BackendAvailability>>;
  disabled?: boolean;
  onRetry?: () => void;
}

export function BackendSelector({
  supportedBackends,
  value,
  onChange,
  availability,
  disabled = false,
  onRetry,
}: BackendSelectorProps) {
  const unavailable = supportedBackends
    .map((backend) => ({ backend, status: availability?.[backend] }))
    .find(({ status }) => status && !status.available);

  return (
    <div className="backend-field">
      <label className="field-group">
        <span className="field-label icon-label">
          <Cpu size={16} /> Execution backend
        </span>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as BackendId)}
        >
          {supportedBackends.map((backend) => (
            <option
              value={backend}
              key={backend}
              disabled={availability?.[backend]?.available === false}
            >
              {backendCatalog[backend].label}
            </option>
          ))}
        </select>
      </label>
      {unavailable?.status?.reason && (
        <div className={`backend-availability${unavailable.status.checking ? " is-checking" : ""}`}>
          <small role="status">
            {backendCatalog[unavailable.backend].shortLabel}: {unavailable.status.reason}
          </small>
          {!unavailable.status.checking && onRetry && (
            <button
              type="button"
              className="backend-retry"
              onClick={onRetry}
              aria-label={`Retry ${backendCatalog[unavailable.backend].shortLabel} availability`}
              title={`Retry ${backendCatalog[unavailable.backend].shortLabel} availability`}
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
