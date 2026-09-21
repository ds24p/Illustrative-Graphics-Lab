import { Cpu } from "lucide-react";
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
}

export function BackendSelector({
  supportedBackends,
  value,
  onChange,
  availability,
  disabled = false,
}: BackendSelectorProps) {
  const unavailable = supportedBackends
    .map((backend) => ({ backend, status: availability?.[backend] }))
    .find(({ status }) => status && !status.available);

  return (
    <label className="field-group backend-field">
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
      {unavailable?.status?.reason && (
        <small className="backend-availability" role="status">
          {backendCatalog[unavailable.backend].shortLabel}: {unavailable.status.reason}
        </small>
      )}
    </label>
  );
}
