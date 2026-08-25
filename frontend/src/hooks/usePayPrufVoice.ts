import { useCallback, useEffect, useRef, useState } from "react";
import {
  PageVoiceScript,
  SpokenReceiptData,
  SpokenVerificationData,
  VoiceInfo,
  VoiceReaderOptions,
  VoiceReaderStatus,
} from "../types/accessibility";
import { announcer } from "../services/accessibility/announcements";
import {
  getReceiptScript,
  getScriptForCurrentRoute,
  getVerificationPageScript,
} from "../services/accessibility/scriptGenerators";
import { ttsManager, TTSProviderInfo } from "../services/tts";
import { splitIntoSentences } from "../utils/speechSynthesis";

export interface UsePayPrufVoiceReturn {
  status: VoiceReaderStatus;
  currentSentence: string;
  currentSentenceIndex: number;
  totalSentences: number;
  activeScriptTitle: string;
  error: string | null;
  voices: VoiceInfo[];
  selectedVoice: VoiceInfo | null;
  isNigerianVoice: boolean;
  rate: number;
  volume: number;
  providers: TTSProviderInfo[];
  activeProviderId: string;
  liveAnnouncementsEnabled: boolean;

  // Actions
  speak: (text: string, options?: VoiceReaderOptions) => Promise<void>;
  speakScript: (script: PageVoiceScript, options?: VoiceReaderOptions) => Promise<void>;
  speakPage: (options?: VoiceReaderOptions) => Promise<void>;
  speakReceipt: (data?: SpokenReceiptData, options?: VoiceReaderOptions) => Promise<void>;
  speakVerification: (data?: SpokenVerificationData, options?: VoiceReaderOptions) => Promise<void>;
  testVoiceSample: () => Promise<void>;
  testNigerianVoice: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setSelectedVoice: (voice: VoiceInfo | null) => void;
  setProviderId: (providerId: string) => void;
  setLiveAnnouncementsEnabled: (enabled: boolean) => void;
}

export function usePayPrufVoice(): UsePayPrufVoiceReturn {
  const [status, setStatus] = useState<VoiceReaderStatus>("idle");
  const [currentSentence, setCurrentSentence] = useState<string>("");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [totalSentences, setTotalSentences] = useState<number>(0);
  const [activeScriptTitle, setActiveScriptTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceInfo | null>(null);
  const [isNigerianVoice, setIsNigerianVoice] = useState<boolean>(false);
  const [rate, setRateState] = useState<number>(1.0);
  const [volume] = useState<number>(1.0);
  const [activeProviderId, setActiveProviderIdState] = useState<string>(
    ttsManager.getActiveProviderId()
  );
  const [providers, setProviders] = useState<TTSProviderInfo[]>(ttsManager.listProviders());
  const [liveAnnouncementsEnabled, setLiveAnnouncementsEnabled] = useState<boolean>(true);

  const cancelActiveSpeechRef = useRef<(() => void) | null>(null);
  const rateRef = useRef(rate);
  const selectedVoiceRef = useRef(selectedVoice);
  const liveAnnouncementsRef = useRef(liveAnnouncementsEnabled);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
    setIsNigerianVoice(Boolean(selectedVoice?.isNigerian));
  }, [selectedVoice]);

  useEffect(() => {
    liveAnnouncementsRef.current = liveAnnouncementsEnabled;
  }, [liveAnnouncementsEnabled]);

  // Load voices for current active provider
  const refreshVoices = useCallback(async () => {
    try {
      const activeProvider = ttsManager.getActiveProvider();
      const available = await activeProvider.getVoices();
      setVoices(available);

      if (available.length > 0) {
        // Auto-select Nigerian voice if available, otherwise first English / default voice
        const ngVoice = available.find((v) => v.isNigerian);
        const defaultVoice = ngVoice || available.find((v) => v.isDefault) || available[0];
        setSelectedVoice((prev) => {
          const chosen = prev || defaultVoice;
          setIsNigerianVoice(Boolean(chosen?.isNigerian));
          return chosen;
        });
      }
    } catch (err: any) {
      console.warn("Failed to load voices:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    refreshVoices();

    const handleVoicesChanged = () => {
      if (mounted) refreshVoices();
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      }
    };
  }, [refreshVoices, activeProviderId]);

  // Listen to application announcements
  useEffect(() => {
    const unsubscribe = announcer.subscribe((message) => {
      if (!liveAnnouncementsRef.current) return;
      // If voice reader is currently idle or stopped, speak the live announcement
      if (status === "idle" || status === "stopped") {
        ttsManager.getActiveProvider().speak(
          [message],
          {
            rate: rateRef.current,
            voice: selectedVoiceRef.current?.voice || selectedVoiceRef.current?.name,
            preferNigerian: true,
          },
          {
            onStart: () => {
              setStatus("speaking");
              setCurrentSentence(message);
              setCurrentSentenceIndex(0);
              setTotalSentences(1);
              setActiveScriptTitle("System Notice");
            },
            onEnd: () => {
              setStatus("idle");
              setCurrentSentence("");
            },
            onError: (err) => {
              console.warn("Announcement speech error:", err);
              setStatus("idle");
            },
          }
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [status]);

  const stop = useCallback(() => {
    if (cancelActiveSpeechRef.current) {
      cancelActiveSpeechRef.current();
      cancelActiveSpeechRef.current = null;
    }
    ttsManager.getActiveProvider().stop();
    setStatus("stopped");
    setCurrentSentence("");
    setCurrentSentenceIndex(0);
    setTotalSentences(0);
    setError(null);
  }, []);

  const pause = useCallback(() => {
    ttsManager.getActiveProvider().pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    ttsManager.getActiveProvider().resume();
    setStatus("speaking");
  }, []);

  const speakScript = useCallback(
    async (script: PageVoiceScript, options?: VoiceReaderOptions) => {
      stop();
      setError(null);

      const sentences = script.sentences.filter((s) => s && s.trim().length > 0);
      if (sentences.length === 0) {
        setStatus("idle");
        return;
      }

      setActiveScriptTitle(script.title);
      setTotalSentences(sentences.length);
      setCurrentSentenceIndex(0);

      const activeProvider = ttsManager.getActiveProvider();
      const cancelFn = await activeProvider.speak(
        sentences,
        {
          rate: options?.rate ?? rateRef.current,
          pitch: options?.pitch ?? 1.0,
          volume: options?.volume ?? 1.0,
          voice: options?.voiceUri || selectedVoiceRef.current?.voice || selectedVoiceRef.current?.name,
          preferNigerian: options?.preferNigerian ?? true,
        },
        {
          onStart: () => {
            setStatus("speaking");
          },
          onSentenceStart: (sentence, index, total) => {
            setStatus("speaking");
            setCurrentSentence(sentence);
            setCurrentSentenceIndex(index);
            setTotalSentences(total);
          },
          onEnd: () => {
            setStatus("idle");
            setCurrentSentence("");
            cancelActiveSpeechRef.current = null;
          },
          onError: (err) => {
            console.warn("Speech error:", err);
            setError(typeof err === "string" ? err : err.message);
            setStatus("error");
            cancelActiveSpeechRef.current = null;
          },
          onPause: () => setStatus("paused"),
          onResume: () => setStatus("speaking"),
        }
      );

      cancelActiveSpeechRef.current = cancelFn;
    },
    [stop]
  );

  const speak = useCallback(
    async (text: string, options?: VoiceReaderOptions) => {
      const sentences = splitIntoSentences(text);
      await speakScript(
        {
          title: "Custom Reading",
          sentences,
        },
        options
      );
    },
    [speakScript]
  );

  const speakPage = useCallback(
    async (options?: VoiceReaderOptions) => {
      const script = getScriptForCurrentRoute(
        typeof window !== "undefined" ? window.location.pathname : "/"
      );
      await speakScript(script, options);
    },
    [speakScript]
  );

  const speakReceipt = useCallback(
    async (data?: SpokenReceiptData, options?: VoiceReaderOptions) => {
      const script = getReceiptScript(data);
      await speakScript(script, options);
    },
    [speakScript]
  );

  const speakVerification = useCallback(
    async (data?: SpokenVerificationData, options?: VoiceReaderOptions) => {
      const script = getVerificationPageScript(data);
      await speakScript(script, options);
    },
    [speakScript]
  );

  const testVoiceSample = useCallback(async () => {
    await speakScript(
      {
        title: "PayPruf Voice Test",
        sentences: [
          "Welcome to PayPruf. Proof beyond the receipt.",
          "PayPruf helps Nigerian merchants verify customer payments and eliminate fake transfer receipts.",
        ],
      },
      {
        voiceUri: selectedVoiceRef.current?.name,
        preferNigerian: true,
      }
    );
  }, [speakScript]);

  const testNigerianVoice = testVoiceSample;

  const setProviderId = useCallback(
    (newProviderId: string) => {
      ttsManager.setActiveProvider(newProviderId);
      setActiveProviderIdState(newProviderId);
      setProviders(ttsManager.listProviders());
      refreshVoices();
    },
    [refreshVoices]
  );

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
  }, []);

  return {
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
    volume,
    providers,
    activeProviderId,
    liveAnnouncementsEnabled,

    speak,
    speakScript,
    speakPage,
    speakReceipt,
    speakVerification,
    testVoiceSample,
    testNigerianVoice,
    pause,
    resume,
    stop,
    setRate,
    setSelectedVoice,
    setProviderId,
    setLiveAnnouncementsEnabled,
  };
}
