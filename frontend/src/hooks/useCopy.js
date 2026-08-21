import { useState, useCallback } from "react";

export function useCopy() {
  const [copiedValue, setCopiedValue] = useState(null);

  const copy = useCallback(async (text, _feedbackMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      setTimeout(() => {
        setCopiedValue(null);
      }, 2000);
      return true;
    } catch {
      // Fallback
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedValue(text);
        setTimeout(() => {
          setCopiedValue(null);
        }, 2000);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  return { copy, copiedValue };
}
