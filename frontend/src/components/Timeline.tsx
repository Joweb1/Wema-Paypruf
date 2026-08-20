import { Check, Circle, LoaderCircle, TriangleAlert } from "lucide-react";
import type { TimelineEvent } from "../types/api";
import { formatDateTime } from "../utils/format";

export function Timeline({ items }: { items: TimelineEvent[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => {
        const Icon = item.state === "COMPLETE" ? Check : item.state === "CURRENT" ? LoaderCircle : item.state === "ERROR" ? TriangleAlert : Circle;
        return (
          <li className={`timeline-${item.state.toLowerCase()}`} key={item.key}>
            <span className="timeline-marker"><Icon size={15} aria-hidden="true" /></span>
            <div><strong>{item.label}</strong><span>{item.timestamp ? formatDateTime(item.timestamp) : item.state === "PENDING" ? "Waiting" : "Recorded"}</span></div>
          </li>
        );
      })}
    </ol>
  );
}
