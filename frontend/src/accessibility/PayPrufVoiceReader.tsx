import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Settings2,
  Sparkles,
  Check,
  AlertCircle,
  Bell,
  Cpu,
  X,
} from "lucide-react";
import { usePayPrufVoice } from "../hooks/usePayPrufVoice";

export function PayPrufVoiceReader() {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const {
    status,
    currentSentence,
    currentSentenceIndex,
    totalSentences,
    activeScriptTitle,
    error,
    voices,
    selectedVoice,
    isNigerianVoice,
    rate,
    providers,
    activeProviderId,
    liveAnnouncementsEnabled,
    speakPage,
    testVoiceSample,
    pause,
    resume,
    stop,
    setRate,
    setSelectedVoice,
    setProviderId,
    setLiveAnnouncementsEnabled,
  } = usePayPrufVoice();

  const isPlaying = status === "speaking";
  const isPaused = status === "paused";

  // Stop playback when route changes to avoid reading old page on new route
  useEffect(() => {
    stop();
  }, [location.pathname, stop]);

  const handleReadPage = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      speakPage();
    }
  };

  const handleHide = () => {
    setIsHidden(true);
  };

  const speedOptions = [0.8, 1.0, 1.2, 1.5];

  // Floating audio button when voice reader is hidden
  if (isHidden) {
    return (
      <>
        <button
          id="paypruf-voice-reader-float-btn"
          type="button"
          onClick={() => setIsHidden(false)}
          style={{
            position: "fixed",
            bottom: "20px",
            right: 0,
            zIndex: 9999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            background: "var(--brand, #7b2583)",
            color: "#ffffff",
            border: "none",
            borderRadius: "24px 0 0 24px", // Left side fully curved, right side not curved
            cursor: "pointer",
            boxShadow: "none",
            transition: "all 0.2s ease",
          }}
          title="Open Voice Reader"
          aria-label="Open Voice Reader"
        >
          <Volume2 size={20} />
        </button>
      </>
    );
  }

  return (
    <aside
      id="paypruf-accessibility-voice-reader"
      aria-label="PayPruf Accessibility Voice Reader"
      className="paypruf-voice-reader"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        fontFamily: "'Manrope', 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="voice-reader-panel"
        style={{
          background: "var(--paper, #ffffff)",
          border: "1px solid var(--line-strong, #d7ccda)",
          borderRadius: "16px",
          boxShadow: "0 12px 36px rgba(87, 20, 93, 0.18)",
          width: isSettingsOpen ? "350px" : "auto",
          maxWidth: "calc(100vw - 32px)",
          overflow: "hidden",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Main Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: isPlaying
              ? "linear-gradient(135deg, #57145d 0%, #7b2583 100%)"
              : "var(--paper, #ffffff)",
            color: isPlaying ? "#ffffff" : "var(--ink, #241829)",
          }}
        >
          {/* Primary Action Button */}
          <button
            id="voice-reader-main-btn"
            type="button"
            onClick={handleReadPage}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: isPlaying ? "#ffffff" : "var(--brand, #7b2583)",
              color: isPlaying ? "var(--brand-dark, #57145d)" : "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              transition: "transform 0.15s ease",
            }}
            title={
              isPlaying
                ? "Pause voice reading"
                : isPaused
                ? "Resume voice reading"
                : "Read this page aloud"
            }
          >
            {isPlaying ? (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            ) : isPaused ? (
              <>
                <Play size={16} />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Volume2 size={16} />
                <span>Read this page</span>
              </>
            )}
          </button>

          {/* Stop Button (visible when playing or paused) */}
          {(isPlaying || isPaused) && (
            <button
              id="voice-reader-stop-btn"
              type="button"
              onClick={stop}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                background: isPlaying
                  ? "rgba(255,255,255,0.2)"
                  : "var(--canvas-deep, #f8f5fa)",
                color: isPlaying ? "#ffffff" : "var(--danger, #b0273a)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              title="Stop reading"
              aria-label="Stop reading"
            >
              <Square size={14} fill="currentColor" />
            </button>
          )}

          {/* Voice Indicator Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: isPlaying ? "rgba(255,255,255,0.9)" : "var(--muted, #6f6573)",
              marginRight: "auto",
              paddingLeft: "4px",
            }}
          >
            {isNigerianVoice ? (
              <span title="Genuine Nigerian English voice detected">🇳🇬 NG Voice</span>
            ) : (
              <span title="English fallback voice with Nigerian phonetic normalization">En Voice</span>
            )}
          </div>

          {/* Hide Button */}
          <button
            id="voice-reader-hide-btn"
            type="button"
            onClick={handleHide}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              background: "transparent",
              color: isPlaying ? "#ffffff" : "var(--soft, #796f7d)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Hide voice reader"
            aria-label="Hide voice reader"
          >
            <X size={16} />
          </button>

          {/* Toggle Settings */}
          <button
            id="voice-reader-toggle-settings"
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              background: isSettingsOpen ? "var(--brand-soft, #f7edf8)" : "transparent",
              color: isPlaying
                ? "#ffffff"
                : isSettingsOpen
                ? "var(--brand, #7b2583)"
                : "var(--soft, #796f7d)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            title="Voice reader settings"
            aria-label="Voice settings"
            aria-expanded={isSettingsOpen}
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Live Speaking Caption Line */}
        {(isPlaying || isPaused) && currentSentence && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--brand-soft, #f7edf8)",
              borderTop: "1px solid var(--line, #e9e2eb)",
              fontSize: "0.815rem",
              color: "var(--brand-dark, #57145d)",
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--brand, #7b2583)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <span>{activeScriptTitle || "Reading"}</span>
              <span>
                {currentSentenceIndex + 1} / {totalSentences}
              </span>
            </div>
            <div style={{ fontWeight: 500 }}>"{currentSentence}"</div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: "0.75rem",
              borderTop: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* Expandable Settings Panel */}
        {isSettingsOpen && (
          <div
            style={{
              padding: "14px",
              background: "var(--paper, #ffffff)",
              borderTop: "1px solid var(--line, #e9e2eb)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Speed Control */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--muted, #6f6573)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Speech Speed
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                {speedOptions.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setRate(spd)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor:
                        rate === spd
                          ? "var(--brand, #7b2583)"
                          : "var(--line-strong, #d7ccda)",
                      background:
                        rate === spd
                          ? "var(--brand-soft, #f7edf8)"
                          : "var(--canvas-deep, #f8f5fa)",
                      color:
                        rate === spd
                          ? "var(--brand, #7b2583)"
                          : "var(--ink, #241829)",
                      cursor: "pointer",
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Accent Selector */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--muted, #6f6573)",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Browser Voice
              </label>
              <select
                id="voice-reader-voice-select"
                value={selectedVoice?.name || ""}
                onChange={(e) => {
                  const found = voices.find((v) => v.name === e.target.value);
                  if (found) setSelectedVoice(found);
                }}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--line-strong, #d7ccda)",
                  background: "var(--paper, #ffffff)",
                  fontSize: "0.8rem",
                  color: "var(--ink, #241829)",
                }}
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.displayName}
                  </option>
                ))}
              </select>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.72rem",
                  color: "var(--soft, #796f7d)",
                  lineHeight: 1.35,
                }}
              >
                {isNigerianVoice ? (
                  <span style={{ color: "var(--confirmed, #167153)", fontWeight: 600 }}>
                    ✓ Genuine Nigerian English (en-NG) browser voice active.
                  </span>
                ) : (
                  <span>
                    ℹ️ Using English browser voice with Nigerian fintech phonetic normalization (OPay, Wema, BVN, NIN, Naira).
                  </span>
                )}
              </p>
            </div>

            {/* Live State Announcements Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "var(--canvas-deep, #f8f5fa)",
                borderRadius: "8px",
              }}
            >
              <label
                htmlFor="toggle-live-announcements"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Bell size={14} />
                <span>Live State Announcements</span>
              </label>
              <input
                id="toggle-live-announcements"
                type="checkbox"
                checked={liveAnnouncementsEnabled}
                onChange={(e) => setLiveAnnouncementsEnabled(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
            </div>

            {/* Test Voice Button */}
            <div style={{ paddingTop: "4px" }}>
              <button
                id="voice-reader-test-btn"
                type="button"
                onClick={testVoiceSample}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px dashed var(--brand, #7b2583)",
                  background: "var(--canvas-deep, #f8f5fa)",
                  color: "var(--brand, #7b2583)",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                title="Test Nigerian fintech pronunciation"
              >
                <Sparkles size={14} />
                <span>Test Voice Sample</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
