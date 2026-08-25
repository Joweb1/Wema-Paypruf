import React from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { usePayPrufVoice } from "../hooks/usePayPrufVoice";

interface PageVoiceButtonProps {
  label?: string;
  sentences?: string[];
  customScript?: string | string[];
  title?: string;
  variant?: "primary" | "secondary" | "ghost" | "pill" | "icon";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PageVoiceButton({
  label = "Listen",
  sentences,
  customScript,
  title,
  variant = "secondary",
  className = "",
  size = "md",
}: PageVoiceButtonProps) {
  const { status, speakScript, speak, pause, resume, stop } = usePayPrufVoice();

  const isPlaying = status === "speaking";
  const isPaused = status === "paused";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      if (sentences && sentences.length > 0) {
        speakScript({
          title: title || label,
          sentences,
        });
      } else if (customScript) {
        if (Array.isArray(customScript)) {
          speakScript({
            title: title || label,
            sentences: customScript,
          });
        } else {
          speak(customScript);
        }
      }
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  const getButtonStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      borderRadius: variant === "pill" ? "999px" : "10px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.15s ease",
      fontFamily: "'Manrope', 'Segoe UI', sans-serif",
      fontSize: size === "sm" ? "0.78rem" : "0.85rem",
      padding:
        size === "sm"
          ? "5px 10px"
          : variant === "icon"
          ? "8px"
          : "8px 14px",
    };

    if (variant === "primary") {
      return {
        ...base,
        background: "var(--brand, #7b2583)",
        color: "#ffffff",
        border: "none",
      };
    }

    if (variant === "ghost") {
      return {
        ...base,
        background: "transparent",
        color: "var(--brand, #7b2583)",
        border: "none",
      };
    }

    // Secondary default
    return {
      ...base,
      background: isPlaying
        ? "var(--brand-soft, #f7edf8)"
        : "var(--canvas-deep, #f8f5fa)",
      color: isPlaying ? "var(--brand, #7b2583)" : "var(--ink, #241829)",
      border: `1px solid ${
        isPlaying ? "var(--brand, #7b2583)" : "var(--line-strong, #d7ccda)"
      }`,
    };
  };

  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
      className={className}
    >
      <button
        type="button"
        onClick={handleToggle}
        style={getButtonStyles()}
        title={isPlaying ? "Pause voice" : isPaused ? "Resume voice" : `Listen to ${label}`}
        aria-label={isPlaying ? "Pause voice" : isPaused ? "Resume voice" : `Listen to ${label}`}
      >
        {isPlaying ? (
          <Pause size={14} />
        ) : isPaused ? (
          <Play size={14} />
        ) : (
          <Volume2 size={14} />
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
            padding: "5px 7px",
            borderRadius: "6px",
            background: "var(--canvas-deep, #f8f5fa)",
            color: "var(--danger, #b0273a)",
            border: "1px solid var(--line-strong, #d7ccda)",
            cursor: "pointer",
          }}
          title="Stop playback"
          aria-label="Stop playback"
        >
          <Square size={12} fill="currentColor" />
        </button>
      )}
    </div>
  );
}
