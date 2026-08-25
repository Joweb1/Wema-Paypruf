import React from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { usePayPrufVoice } from "../hooks/usePayPrufVoice";
import { SpokenReceiptData } from "../types/accessibility";

interface ReceiptVoiceButtonProps {
  receiptData?: SpokenReceiptData | any;
  label?: string;
  variant?: "button" | "badge" | "icon" | "pill";
  size?: "sm" | "md";
  className?: string;
}

export function ReceiptVoiceButton({
  receiptData,
  label = "Read Receipt Details",
  variant = "badge",
  size = "sm",
  className = "",
}: ReceiptVoiceButtonProps) {
  const { status, speakReceipt, pause, resume, stop } = usePayPrufVoice();

  if (!receiptData) return null;

  const isPlaying = status === "speaking";
  const isPaused = status === "paused";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      speakReceipt(receiptData);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
      className={className}
    >
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: isPlaying
            ? "var(--brand-soft, #f7edf8)"
            : "var(--paper, #ffffff)",
          color: "var(--brand, #7b2583)",
          border: "1px solid var(--line-strong, #d7ccda)",
          borderRadius: variant === "pill" ? "999px" : "8px",
          padding: size === "sm" ? "4px 10px" : "6px 12px",
          fontSize: size === "sm" ? "0.75rem" : "0.82rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          fontFamily: "'Manrope', 'Segoe UI', sans-serif",
          transition: "all 0.15s ease",
        }}
        title="Read receipt details aloud"
        aria-label="Read receipt details aloud"
      >
        {isPlaying ? (
          <Pause size={13} />
        ) : isPaused ? (
          <Play size={13} />
        ) : (
          <Volume2 size={13} />
        )}
        {variant !== "icon" && (
          <span>{isPlaying ? "Pause" : isPaused ? "Resume" : label}</span>
        )}
      </button>

      {(isPlaying || isPaused) && (
        <button
          type="button"
          onClick={handleStop}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 6px",
            borderRadius: "6px",
            background: "var(--canvas-deep, #f8f5fa)",
            color: "var(--danger, #b0273a)",
            border: "1px solid var(--line, #e9e2eb)",
            cursor: "pointer",
          }}
          title="Stop reading receipt"
          aria-label="Stop reading receipt"
        >
          <Square size={11} fill="currentColor" />
        </button>
      )}
    </div>
  );
}
