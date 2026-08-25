type AnnouncementListener = (message: string, priority: "polite" | "assertive") => void;

class AccessibilityAnnouncer {
  private listeners: Set<AnnouncementListener> = new Set();
  private liveRegionPolite: HTMLElement | null = null;
  private liveRegionAssertive: HTMLElement | null = null;
  private lastAnnouncement = "";
  private lastAnnouncementTime = 0;

  constructor() {
    if (typeof document !== "undefined") {
      this.initLiveRegions();
    }
  }

  private initLiveRegions() {
    if (typeof document === "undefined") return;

    if (!document.getElementById("paypruf-live-polite")) {
      const polite = document.createElement("div");
      polite.id = "paypruf-live-polite";
      polite.setAttribute("aria-live", "polite");
      polite.setAttribute("aria-atomic", "true");
      polite.className = "sr-only";
      polite.style.position = "absolute";
      polite.style.width = "1px";
      polite.style.height = "1px";
      polite.style.padding = "0";
      polite.style.overflow = "hidden";
      polite.style.clip = "rect(0,0,0,0)";
      polite.style.whiteSpace = "nowrap";
      polite.style.border = "0";
      document.body.appendChild(polite);
      this.liveRegionPolite = polite;
    } else {
      this.liveRegionPolite = document.getElementById("paypruf-live-polite");
    }

    if (!document.getElementById("paypruf-live-assertive")) {
      const assertive = document.createElement("div");
      assertive.id = "paypruf-live-assertive";
      assertive.setAttribute("aria-live", "assertive");
      assertive.setAttribute("aria-atomic", "true");
      assertive.className = "sr-only";
      assertive.style.position = "absolute";
      assertive.style.width = "1px";
      assertive.style.height = "1px";
      assertive.style.padding = "0";
      assertive.style.overflow = "hidden";
      assertive.style.clip = "rect(0,0,0,0)";
      assertive.style.whiteSpace = "nowrap";
      assertive.style.border = "0";
      document.body.appendChild(assertive);
      this.liveRegionAssertive = assertive;
    } else {
      this.liveRegionAssertive = document.getElementById("paypruf-live-assertive");
    }
  }

  subscribe(listener: AnnouncementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatches an announcement to screen readers (ARIA live regions) and optional voice synthesizer.
   */
  announce(message: string, priority: "polite" | "assertive" = "polite") {
    if (!message || !message.trim()) return;

    // Prevent immediate duplicate spam within 2 seconds
    const now = Date.now();
    if (this.lastAnnouncement === message && now - this.lastAnnouncementTime < 2000) {
      return;
    }

    this.lastAnnouncement = message;
    this.lastAnnouncementTime = now;

    // 1. Update DOM ARIA live region
    if (typeof document !== "undefined") {
      this.initLiveRegions();
      const target = priority === "assertive" ? this.liveRegionAssertive : this.liveRegionPolite;
      if (target) {
        // Clear and update textContent to re-trigger screen readers
        target.textContent = "";
        setTimeout(() => {
          if (target) target.textContent = message;
        }, 50);
      }
    }

    // 2. Notify subscribers (e.g. voice reader hook)
    this.listeners.forEach((listener) => {
      try {
        listener(message, priority);
      } catch (err) {
        console.warn("Announcement listener error:", err);
      }
    });
  }

  // Pre-built domain-specific announcement helpers
  announceReceiptUploadStart() {
    this.announce("Uploading receipt.", "polite");
  }

  announceReceiptProcessingStart() {
    this.announce("Analyzing receipt.", "polite");
  }

  announceVerificationSuccess() {
    this.announce(
      "Payment verified. The receipt matches the transaction received by the merchant.",
      "assertive"
    );
  }

  announceVerificationFailure() {
    this.announce(
      "Payment not received. No matching transaction was found in the merchant account.",
      "assertive"
    );
  }

  announceVerificationMismatch() {
    this.announce(
      "Payment discrepancy detected. The receipt amount or beneficiary does not match the ledger transfer.",
      "assertive"
    );
  }

  announceError(errorText: string) {
    this.announce(`Error: ${errorText}`, "assertive");
  }
}

export const announcer = new AccessibilityAnnouncer();
