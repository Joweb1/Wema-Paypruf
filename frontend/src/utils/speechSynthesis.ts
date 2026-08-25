import { moneyToWords } from "./numberToWords";

/**
 * Normalizes Nigerian fintech terminology, currencies, and acronyms for clear pronunciation.
 */
export function normalizeNigerianFintechText(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Replace Naira amounts (e.g. ₦10,500 or ₦ 25,000.50 or NGN 5,000) with spoken words
  result = result.replace(/(?:₦|NGN)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi, (_, amountStr) => {
    return ` ${moneyToWords(amountStr, "NGN")} `;
  });

  // 2. Replace solitary currency symbols
  result = result.replace(/₦/g, " naira ");

  // 3. Fintech brand and system pronunciations
  const replacements: Array<[RegExp, string]> = [
    [/\bPay[pP]ruf\b/g, "Pay Proof"],
    [/\bWema\b/gi, "Weh-ma"],
    [/\bOPay\b/gi, "Oh Pay"],
    [/\bPalmpay\b/gi, "Palm pay"],
    [/\bPalmPay\b/g, "Palm pay"],
    [/\bMoniepoint\b/gi, "Money point"],
    [/\bKuda\b/gi, "Koo-dah"],
    [/\bNIBSS\b/g, "N I B S S"],
    [/\bNIP\b/g, "N I P"],
    [/\bBVN\b/g, "B V N"],
    [/\bNIN\b/g, "N I N"],
    [/\bPOS\b/g, "P O S"],
    [/\bOCR\b/g, "O C R"],
    [/\bML\b/g, "M L"],
    [/\bAI\b/g, "A I"],
    [/\bAPI\b/g, "A P I"],
    [/\bRef:\b/gi, "Reference:"],
    [/\bAcc:\b/gi, "Account:"],
    [/\bAcct:\b/gi, "Account:"],
    [/\bNo\.\b/gi, "Number"],
    [/\bKYC\b/g, "K Y C"],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // 4. Transaction references, session IDs, and long reference codes digit-by-digit expansion
  result = result.replace(/(?:Reference|Ref|Session ID|Txn Ref|Transaction Reference)[:\s]+([A-Za-z0-9-_]{6,})/gi, (match, code) => {
    const spacedDigits = code.split("").join(" ");
    return `Reference ${spacedDigits}`;
  });

  // Normalize excessive whitespaces
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Splits continuous text into natural sentences for chunked SpeechSynthesis.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];

  // Match sentences ending in punctuation or clean newline splits
  const rawSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawSentences;
}

/**
 * Retrieves the available browser voices, handling async voice loading in Chromium.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Chromium loads voices asynchronously
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

    // Timeout fallback in case voiceschanged never fires
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 1500);
  });
}

/**
 * Checks whether a given voice is specifically a Nigerian English voice.
 */
export function isNigerianVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice) return false;
  const lang = (voice.lang || "").toLowerCase().replace("_", "-");
  const name = (voice.name || "").toLowerCase();

  return (
    lang === "en-ng" ||
    name.includes("nigeria") ||
    name.includes("nigerian")
  );
}

/**
 * Finds a Nigerian English voice if available on the user's device.
 */
export function findNigerianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find(isNigerianVoice) || null;
}

/**
 * Resolves a requested voice identifier or object against the browser's native SpeechSynthesisVoice list.
 * STRICT GUARANTEE: Returns an authentic SpeechSynthesisVoice object from window.speechSynthesis.getVoices(), or null.
 * NEVER returns a plain JS object, string, or non-browser voice object.
 */
export function resolveBrowserVoice(
  requestedVoice: unknown,
  availableVoices: SpeechSynthesisVoice[],
  preferNigerian: boolean = true
): SpeechSynthesisVoice | null {
  if (!availableVoices || !Array.isArray(availableVoices) || availableVoices.length === 0) {
    return null;
  }

  // 1. Direct reference match in availableVoices
  if (requestedVoice && typeof requestedVoice === "object") {
    const directMatch = availableVoices.find((v) => v === requestedVoice);
    if (directMatch) return directMatch;
  }

  // 2. Extract potential string identifiers (name, voiceURI, lang)
  let targetNameOrUri = "";
  if (typeof requestedVoice === "string") {
    targetNameOrUri = requestedVoice.trim().toLowerCase();
  } else if (requestedVoice && typeof requestedVoice === "object") {
    const raw = requestedVoice as any;
    targetNameOrUri = (raw.name || raw.voiceURI || raw.voiceUri || raw.lang || "").toString().trim().toLowerCase();
  }

  // 3. Match against available browser voices by exact URI or Name
  if (targetNameOrUri) {
    const directMatch = availableVoices.find((v) => {
      const vName = (v.name || "").toLowerCase();
      const vUri = (v.voiceURI || "").toLowerCase();
      return vName === targetNameOrUri || vUri === targetNameOrUri;
    });
    if (directMatch) return directMatch;

    const partialMatch = availableVoices.find((v) => {
      const vName = (v.name || "").toLowerCase();
      const vUri = (v.voiceURI || "").toLowerCase();
      return vName.includes(targetNameOrUri) || vUri.includes(targetNameOrUri);
    });
    if (partialMatch) return partialMatch;
  }

  // 4. Preference for native Nigerian English voice if requested
  if (preferNigerian) {
    const nigerianVoice = availableVoices.find(isNigerianVoice);
    if (nigerianVoice) return nigerianVoice;
  }

  // 5. English cascade: British English -> US English -> Any English -> Default -> First voice
  const gbVoice = availableVoices.find((v) => (v.lang || "").toLowerCase().startsWith("en-gb"));
  if (gbVoice) return gbVoice;

  const usVoice = availableVoices.find((v) => (v.lang || "").toLowerCase().startsWith("en-us"));
  if (usVoice) return usVoice;

  const enVoice = availableVoices.find((v) => (v.lang || "").toLowerCase().startsWith("en"));
  if (enVoice) return enVoice;

  const defaultVoice = availableVoices.find((v) => Boolean(v.default));
  if (defaultVoice) return defaultVoice;

  return availableVoices[0] || null;
}

