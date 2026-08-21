import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

const stages = [
  "Reading receipt",
  "Extracting transaction details",
  "Checking payment request",
  "Checking Wema sandbox transaction",
  "Comparing payment information",
];

export function VerificationProgress({ active }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrent(0);
      return;
    }
    const interval = window.setInterval(() => {
      setCurrent((value) => Math.min(value + 1, stages.length - 1));
    }, 700);
    return () => window.clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="verification-progress" role="status" aria-live="polite">
      <div className="progress-heading">
        <span className="verify-pulse">
          <LoaderCircle size={24} />
        </span>
        <div>
          <strong>Checking your payment</strong>
          <span>{stages[current]}</span>
        </div>
      </div>
      <ol>
        {stages.map((stage, index) => (
          <li
            className={index < current ? "done" : index === current ? "current" : ""}
            key={stage}
          >
            <span>{index < current ? <Check size={13} /> : index + 1}</span>
            {stage}
          </li>
        ))}
      </ol>
      <p>
        PayPruf is comparing receipt details with merchant-side records. Please
        keep this page open.
      </p>
    </div>
  );
}
