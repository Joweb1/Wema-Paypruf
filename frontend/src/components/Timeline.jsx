import { Check, Clock3, LoaderCircle, X } from "lucide-react";
import { formatDateTime } from "../utils/format";

export function Timeline({ items = [] }) {
  if (!items.length) return null;

  return (
    <ol className="timeline" aria-label="Verification progress">
      {items.map((item, index) => {
        const isCurrent = item.state === "current";
        const isError = item.state === "error";
        const isComplete = item.state === "complete";

        return (
          <li
            key={index}
            className={
              isComplete
                ? "timeline-complete"
                : isCurrent
                ? "timeline-current"
                : isError
                ? "timeline-error"
                : ""
            }
          >
            <span className="timeline-marker" aria-hidden="true">
              {isComplete && <Check size={14} />}
              {isCurrent && <LoaderCircle size={14} />}
              {isError && <X size={14} />}
              {!isComplete && !isCurrent && !isError && <Clock3 size={14} />}
            </span>
            <div>
              <strong>{item.title}</strong>
              {item.timestamp && <span>{formatDateTime(item.timestamp)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
