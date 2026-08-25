import { VoiceInfo, VoiceReaderOptions } from "../../types/accessibility";

export interface TTSSpeakOptions extends VoiceReaderOptions {
  voice?: SpeechSynthesisVoice | string;
  rate?: number;
  pitch?: number;
  volume?: number;
  preferNigerian?: boolean;
}

export interface TTSPlaybackCallbacks {
  onStart?: () => void;
  onSentenceStart?: (sentence: string, index: number, total: number) => void;
  onEnd?: () => void;
  onError?: (error: Error | string) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface TTSProviderInfo {
  id: string;
  name: string;
  description: string;
  isCloud: boolean;
  supportsNigerianVoice: boolean;
  requiresApiKey: boolean;
}

/**
 * Interface that all TTS providers (Browser SpeechSynthesis, Cloud TTS, etc.) must implement.
 * This decouples speech generation and UI controls from the underlying audio synthesis engine.
 */
export interface ITTSProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isCloud: boolean;

  /**
   * Checks if this provider is currently available (e.g. browser support, network connection, API key).
   */
  isAvailable(): Promise<boolean>;

  /**
   * Retrieves the list of available voices for this provider.
   */
  getVoices(): Promise<VoiceInfo[]>;

  /**
   * Speaks an array of prepared sentences sequentially.
   * Returns a cancellation function.
   */
  speak(
    sentences: string[],
    options: TTSSpeakOptions,
    callbacks?: TTSPlaybackCallbacks
  ): Promise<() => void>;

  /**
   * Pauses the active audio playback.
   */
  pause(): void;

  /**
   * Resumes paused audio playback.
   */
  resume(): void;

  /**
   * Stops all active speech synthesis immediately and cleans up resources.
   */
  stop(): void;
}
