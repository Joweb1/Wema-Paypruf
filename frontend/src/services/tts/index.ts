import { BrowserSpeechSynthesisProvider } from "./BrowserSpeechSynthesisProvider";
import { ITTSProvider, TTSProviderInfo } from "./types";

export * from "./types";
export * from "./BrowserSpeechSynthesisProvider";

class TTSManager {
  private browserProvider: BrowserSpeechSynthesisProvider;

  constructor() {
    this.browserProvider = new BrowserSpeechSynthesisProvider();
  }

  getProvider(): ITTSProvider {
    return this.browserProvider;
  }

  getActiveProvider(): ITTSProvider {
    return this.browserProvider;
  }

  getActiveProviderId(): string {
    return "browser-speech-synthesis";
  }

  listProviders(): TTSProviderInfo[] {
    return [
      {
        id: "browser-speech-synthesis",
        name: "Browser SpeechSynthesis (Native)",
        description: "Offline native browser speech engine with Nigerian fintech phonetic normalization",
        isCloud: false,
        supportsNigerianVoice: true,
        requiresApiKey: false,
      },
    ];
  }
}

export const ttsManager = new TTSManager();
