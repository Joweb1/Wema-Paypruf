import { useState } from "react";
import { useToast } from "./useToast";

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}

export function useCopy() {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const { pushToast } = useToast();

  const copy = async (value: string, label = "Copied") => {
    try {
      await writeClipboard(value);
      setCopiedValue(value);
      pushToast(label);
      window.setTimeout(() => setCopiedValue((current) => current === value ? null : current), 1800);
      return true;
    } catch {
      pushToast("Copy did not work. Select and copy the text manually.", "error");
      return false;
    }
  };

  return { copy, copiedValue };
}
