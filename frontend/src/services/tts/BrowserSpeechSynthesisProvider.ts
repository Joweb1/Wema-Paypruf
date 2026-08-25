import { VoiceInfo } from "../../types/accessibility";
import {
  getAvailableVoices,
  isNigerianVoice,
  normalizeNigerianFintechText,
  resolveBrowserVoice,
} from "../../utils/speechSynthesis";
import { ITTSProvider, TTSPlaybackCallbacks, TTSSpeakOptions } from "./types";

/**
 * Standard browser SpeechSynthesis TTS Provider.
 * Zero backend/cloud dependency, runs 100% offline in browser runtime.
 */
export class BrowserSpeechSynthesisProvider implements ITTSProvider {
  readonly id = "browser-speech-synthesis";
  readonly name = "Browser SpeechSynthesis (Native)";
  readonly description = "Offline browser speech engine with Nigerian fintech phonetic normalization";
  readonly isCloud = false;

  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isCancelled = false;
  private isPaused = false;
  private keepAliveTimer: any = null;
  private currentSessionId = 0;

  async isAvailable(): Promise<boolean> {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  async getVoices(): Promise<VoiceInfo[]> {
    if (!(await this.isAvailable())) {
      return [];
    }

    const rawVoices = await getAvailableVoices();
    return rawVoices.map((voice) => {
      const isNg = isNigerianVoice(voice);
      const isDefault = Boolean(voice.default);
      let displayName = voice.name;

      if (isNg) {
        displayName = `🇳🇬 ${voice.name} (Nigerian English)`;
      } else if (voice.lang.toLowerCase().startsWith("en-gb")) {
        displayName = `🇬🇧 ${voice.name} (British English)`;
      } else if (voice.lang.toLowerCase().startsWith("en-us")) {
        displayName = `🇺🇸 ${voice.name} (US English)`;
      } else if (voice.lang.toLowerCase().startsWith("en")) {
        displayName = `🌐 ${voice.name} (${voice.lang})`;
      }

      return {
        voice,
        name: voice.name,
        lang: voice.lang,
        isNigerian: isNg,
        displayName,
        isDefault,
      };
    });
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Chrome bug: SpeechSynthesis can stall on sentences longer than 15s.
    // Toggling pause/resume periodically prevents silent freezes.
    this.keepAliveTimer = setInterval(() => {
      if (
        window.speechSynthesis.speaking &&
        !window.speechSynthesis.paused &&
        !this.isPaused
      ) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  async speak(
    sentences: string[],
    options: TTSSpeakOptions = {},
    callbacks?: TTSPlaybackCallbacks
  ): Promise<() => void> {
    if (!(await this.isAvailable())) {
      const err = new Error("Speech synthesis is not supported in this browser.");
      callbacks?.onError?.(err);
      return () => {};
    }

    // Cancel any ongoing speech
    this.stop();
    this.isCancelled = false;
    this.isPaused = false;
    this.currentSessionId += 1;
    const sessionId = this.currentSessionId;

    if (!sentences || sentences.length === 0) {
      callbacks?.onEnd?.();
      return () => {};
    }

    // Retrieve current browser native voices
    const availableVoices =
      typeof window !== "undefined" && window.speechSynthesis
        ? window.speechSynthesis.getVoices()
        : [];

    // Strictly resolve targetVoice against native SpeechSynthesisVoice instances
    const targetVoice: SpeechSynthesisVoice | null = resolveBrowserVoice(
      options.voice,
      availableVoices,
      options.preferNigerian !== false
    );

    let currentIndex = 0;
    callbacks?.onStart?.();
    this.startKeepAlive();

    const playSentence = (index: number) => {
      if (this.isCancelled || sessionId !== this.currentSessionId) {
        this.stopKeepAlive();
        return;
      }

      if (index >= sentences.length) {
        this.stopKeepAlive();
        callbacks?.onEnd?.();
        return;
      }

      const rawSentence = sentences[index];
      // Normalize phonetic pronunciation for Nigerian fintech terms
      const textToSpeak = normalizeNigerianFintechText(rawSentence);

      if (!textToSpeak.trim()) {
        playSentence(index + 1);
        return;
      }

      callbacks?.onSentenceStart?.(rawSentence, index, sentences.length);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // DEFENSIVE ASSIGNMENT: Ensure targetVoice is an authentic SpeechSynthesisVoice in availableVoices
      if (
        targetVoice &&
        typeof targetVoice === "object" &&
        availableVoices.some((v) => v === targetVoice)
      ) {
        try {
          utterance.voice = targetVoice;
        } catch (voiceErr) {
          console.warn("SpeechSynthesisUtterance.voice assignment failed, using system default:", voiceErr);
          utterance.voice = null;
        }
      } else {
        utterance.voice = null;
      }

      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      utterance.onend = () => {
        if (!this.isCancelled && sessionId === this.currentSessionId) {
          currentIndex = index + 1;
          playSentence(currentIndex);
        }
      };

      utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (e.error === "interrupted" || e.error === "canceled") {
          return;
        }
        console.warn("Browser SpeechSynthesis utterance error:", e);
        if (!this.isCancelled && sessionId === this.currentSessionId) {
          currentIndex = index + 1;
          playSentence(currentIndex);
        }
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Small timeout for browser event loop stability
    setTimeout(() => {
      if (!this.isCancelled && sessionId === this.currentSessionId) {
        playSentence(0);
      }
    }, 50);

    return () => {
      this.stop();
    };
  }

  pause(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.isPaused = true;
      }
    }
  }

  resume(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.isPaused = false;
      }
    }
  }

  stop(): void {
    this.isCancelled = true;
    this.isPaused = false;
    this.currentSessionId += 1;
    this.stopKeepAlive();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
  }
}
