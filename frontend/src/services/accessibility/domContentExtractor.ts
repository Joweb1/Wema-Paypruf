import { PageVoiceScript } from "../../types/accessibility";

/**
 * Checks if an HTML element is actually visible to the user.
 */
function isElementVisible(el: HTMLElement): boolean {
  if (!el) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.classList.contains("sr-only")) return false;

  // Check inline styles or computed styles
  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  // Ensure element has dimensions or layout
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && !el.textContent?.trim()) {
    return false;
  }

  return true;
}

/**
 * Sanitizes plain text by removing excessive whitespace, code artifacts, and non-phonetic characters.
 */
function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ")
    .replace(/[•·]/g, ", ")
    .replace(/\s*([,.;?!])\s*/g, "$1 ")
    .trim();
}

/**
 * Formats a button element into a clear spoken phrase.
 */
function formatButtonElement(btn: HTMLButtonElement | HTMLAnchorElement): string | null {
  if (!isElementVisible(btn)) return null;

  // Don't read the voice reader's own buttons
  if (btn.closest(".paypruf-voice-reader") || btn.closest(".voice-reader-panel")) {
    return null;
  }

  const ariaLabel = btn.getAttribute("aria-label")?.trim();
  const text = cleanText(btn.textContent || "");
  const label = ariaLabel || text;

  if (!label || label.length > 80) return null;
  // Ignore pure icon toggle labels that are redundant
  if (label === "Copy" || label === "Close" || label === "Dismiss") return null;

  if (label.toLowerCase().endsWith("button")) {
    return `${label}.`;
  }
  return `${label} button.`;
}

/**
 * Formats an input / form control into an accessible spoken description.
 */
function formatInputElement(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | null {
  if (!isElementVisible(input)) return null;
  if (input.type === "hidden") return null;

  // Ignore voice reader inputs
  if (input.closest(".paypruf-voice-reader")) return null;

  // File upload input
  if (input.type === "file") {
    const accept = input.getAttribute("accept") || "PNG, JPEG, PDF";
    return `Upload payment receipt. Accepted file types are ${accept.replace(/\./g, "").toUpperCase()}.`;
  }

  // Find associated label
  let labelText = "";
  if (input.id) {
    const labelEl = document.querySelector(`label[for="${input.id}"]`);
    if (labelEl && isElementVisible(labelEl as HTMLElement)) {
      labelText = cleanText(labelEl.textContent || "");
    }
  }

  if (!labelText) {
    const parentLabel = input.closest("label");
    if (parentLabel) {
      labelText = cleanText(parentLabel.textContent || "");
    }
  }

  if (!labelText) {
    labelText = input.getAttribute("aria-label") || input.getAttribute("name") || "";
  }

  labelText = labelText.replace(/\*/g, "").trim();

  // Checkbox or Radio
  if (input.type === "checkbox" || input.type === "radio") {
    const checked = (input as HTMLInputElement).checked;
    return `${labelText || "Option"} ${input.type}. Currently ${checked ? "checked" : "unchecked"}.`;
  }

  // Select dropdown
  if (input.tagName.toLowerCase() === "select") {
    const select = input as HTMLSelectElement;
    const selectedOption = select.options[select.selectedIndex]?.text;
    return `${labelText || "Selection"} dropdown. Currently selected: ${selectedOption || "None"}.`;
  }

  const placeholder = input.placeholder ? ` ${input.placeholder}.` : "";
  const value = input.value ? ` Current value: ${input.value}.` : "";
  const required = input.required ? " Required field." : "";

  if (value) {
    return `${labelText || "Input field"}.${required}${value}`;
  }

  if (placeholder) {
    return `${labelText || "Input field"}.${required} Enter ${labelText ? labelText.toLowerCase() : "value"}.${placeholder}`;
  }

  return `${labelText || "Input field"}.${required} Enter your ${labelText ? labelText.toLowerCase() : "value"}.`;
}

/**
 * Inspects the current document DOM and generates a prioritized, accessibility-friendly spoken script.
 */
export function extractPageVoiceScript(container: HTMLElement | Document = document): PageVoiceScript {
  const root = container instanceof Document ? container.body : container;
  if (!root) {
    return { title: "PayPruf", sentences: ["Welcome to PayPruf."] };
  }

  const sentences: string[] = [];
  const seenSentences = new Set<string>();

  const addSentence = (text: string | null | undefined) => {
    if (!text) return;
    const cleaned = cleanText(text);
    if (cleaned.length < 2) return;
    const normalized = cleaned.toLowerCase();
    if (!seenSentences.has(normalized)) {
      seenSentences.add(normalized);
      // Ensure clean punctuation ending
      const punctuated = /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
      sentences.push(punctuated);
    }
  };

  // 1. Page Title / Modal Title
  let pageTitle = "";
  const modalHeading = root.querySelector("[role='dialog'] h1, [role='dialog'] h2, .modal h1, .modal h2");
  if (modalHeading && isElementVisible(modalHeading as HTMLElement)) {
    pageTitle = cleanText(modalHeading.textContent || "");
  }

  if (!pageTitle) {
    const h1 = root.querySelector("h1");
    if (h1 && isElementVisible(h1)) {
      pageTitle = cleanText(h1.textContent || "");
    }
  }

  if (!pageTitle) {
    pageTitle = document.title ? document.title.replace(/\|.*$/, "").trim() : "PayPruf";
  }

  addSentence(pageTitle);

  // 2. High-priority Alert / Error messages
  const alerts = root.querySelectorAll("[role='alert'], .inline-alert, .field-error, .status-banner-error, .toast");
  alerts.forEach((alert) => {
    if (isElementVisible(alert as HTMLElement)) {
      const alertText = cleanText(alert.textContent || "");
      if (alertText) {
        addSentence(`Important alert: ${alertText}`);
      }
    }
  });

  // 3. Subtitles & Key Descriptions
  const subtitles = root.querySelectorAll(".auth-subtitle, .customer-intro p, .page-desc, .hero p, .dashboard-subheading");
  subtitles.forEach((sub) => {
    if (isElementVisible(sub as HTMLElement)) {
      addSentence(sub.textContent);
    }
  });

  // 4. Verification Results & Badges
  const resultHero = root.querySelector(".result-hero, .verification-banner, .status-badge");
  if (resultHero && isElementVisible(resultHero as HTMLElement)) {
    const statusText = cleanText(resultHero.textContent || "");
    if (statusText) {
      addSentence(`Verification result: ${statusText}`);
    }
  }

  // 5. Amount comparison & ledger cards
  const volumeCard = root.querySelector(".volume-card");
  if (volumeCard && isElementVisible(volumeCard as HTMLElement)) {
    const label = cleanText(volumeCard.querySelector("span, small")?.textContent || "Total verified volume");
    const val = cleanText(volumeCard.querySelector("strong")?.textContent || "");
    if (val) addSentence(`${label}: ${val}`);
  }

  const metricCards = root.querySelectorAll(".metric-card, .metric-confirmed, .metric-pending, .metric-mismatch, .metric-not-received");
  metricCards.forEach((card) => {
    if (isElementVisible(card as HTMLElement)) {
      const label = cleanText(card.querySelector(".metric-label, span")?.textContent || "");
      const count = cleanText(card.querySelector("strong")?.textContent || "");
      const amt = cleanText(card.querySelector("small")?.textContent || "");
      if (label && count) {
        addSentence(`${count} ${label}${amt ? `, totaling ${amt}` : ""}`);
      }
    }
  });

  // 6. Bank Details / Transaction summary (<dl>, <dt>, <dd>)
  const dlList = root.querySelectorAll("dl");
  dlList.forEach((dl) => {
    if (isElementVisible(dl)) {
      const items = dl.querySelectorAll(".detail-item, .account-number-row, div");
      items.forEach((item) => {
        const dt = cleanText(item.querySelector("dt")?.textContent || "");
        const dd = cleanText(item.querySelector("dd")?.textContent || "");
        if (dt && dd) {
          addSentence(`${dt}: ${dd}`);
        }
      });
    }
  });

  // 7. Form Controls (Inputs, Selects, Checkboxes, Dropzones)
  const form = root.querySelector("form") || root.querySelector(".auth-card, .instruction-card");
  if (form && isElementVisible(form as HTMLElement)) {
    // Check for toggles/tabs
    const toggles = form.querySelectorAll(".toggle-group .toggle-pill.is-active");
    toggles.forEach((t) => {
      if (isElementVisible(t as HTMLElement)) {
        addSentence(`Selected method: ${cleanText(t.textContent || "")}`);
      }
    });

    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      const spoken = formatInputElement(input as HTMLInputElement);
      if (spoken) addSentence(spoken);
    });

    // Check for custom receipt dropzone if file input not found
    const dropzone = form.querySelector(".receipt-dropzone");
    if (dropzone && isElementVisible(dropzone as HTMLElement)) {
      const dropTitle = cleanText(dropzone.querySelector("strong")?.textContent || "Upload payment receipt");
      const dropLimits = cleanText(dropzone.querySelector("small")?.textContent || "Accepted formats: PNG, JPG, or PDF");
      addSentence(`${dropTitle}. ${dropLimits}`);
    }
  }

  // 8. Buttons & Actions
  const actionButtons = root.querySelectorAll("button.button-primary, button.auth-submit, button.verify-button, .action-buttons button, a.button-primary");
  actionButtons.forEach((btn) => {
    const btnSpoken = formatButtonElement(btn as HTMLButtonElement);
    if (btnSpoken) addSentence(btnSpoken);
  });

  // 9. If still fewer than 2 sentences, fall back to general headings and paragraphs
  if (sentences.length < 2) {
    const generalHeadings = root.querySelectorAll("h2, h3, p");
    generalHeadings.forEach((el) => {
      if (
        isElementVisible(el as HTMLElement) &&
        !el.closest("nav") &&
        !el.closest("footer") &&
        !el.closest(".paypruf-voice-reader")
      ) {
        addSentence(el.textContent);
      }
    });
  }

  return {
    title: pageTitle,
    sentences: sentences.slice(0, 25), // Cap at 25 concise sentences for optimal listening experience
  };
}
