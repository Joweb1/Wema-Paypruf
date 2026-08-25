import { PageVoiceScript, SpokenReceiptData, SpokenVerificationData } from "../../types/accessibility";
import { moneyToWords } from "../../utils/numberToWords";
import { extractPageVoiceScript } from "./domContentExtractor";

/**
 * Spoken digit formatter for reference and account numbers.
 * E.g. "123456789" -> "one two three four five six seven eight nine"
 */
export function formatSpokenDigits(numStr?: string): string {
  if (!numStr) return "";
  const digitMap: Record<string, string> = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
  };

  return numStr
    .split("")
    .map((ch) => digitMap[ch] || ch)
    .join(" ");
}

/**
 * Generates an accessible, structured narrative for ML-extracted receipt data.
 */
export function getReceiptScript(receiptData?: SpokenReceiptData | any): PageVoiceScript {
  if (receiptData && (receiptData.amount || receiptData.extracted_amount || receiptData.reference || receiptData.bank)) {
    const amountVal = receiptData.extracted_amount ?? receiptData.amount;
    const currency = receiptData.currency || "NGN";
    const sender = receiptData.sender_name || receiptData.sender;
    const recipient = receiptData.recipient_name || receiptData.beneficiary || receiptData.recipient;
    const bank = receiptData.bank || receiptData.issuing_institution;
    const ref = receiptData.reference || receiptData.receipt_reference;
    const confidence = receiptData.confidence ?? receiptData.ocr_confidence;
    const isAuthentic = receiptData.is_authentic ?? receiptData.authentic;
    const fraudFlags = receiptData.fraud_flags || receiptData.warnings || [];

    const sentences: string[] = ["Receipt forensic analysis complete."];

    if (amountVal !== undefined && amountVal !== null && amountVal !== "") {
      const spokenAmount = moneyToWords(amountVal, currency);
      sentences.push(`The transaction amount is ${spokenAmount}.`);
    }

    if (bank && bank !== "Not detected" && bank !== "Unknown") {
      sentences.push(`The issuing bank is ${bank}.`);
    }

    if (sender && sender !== "Not detected" && sender !== "Unknown") {
      sentences.push(`The sender name on the receipt is ${sender}.`);
    }

    if (recipient && recipient !== "Not detected" && recipient !== "Unknown") {
      sentences.push(`The recipient beneficiary is ${recipient}.`);
    }

    if (ref && ref !== "Not detected" && ref !== "Unknown") {
      // If reference is a number, speak digits clearly
      const cleanRef = String(ref).trim();
      if (/^\d+$/.test(cleanRef)) {
        sentences.push(`The transaction reference is ${formatSpokenDigits(cleanRef)}.`);
      } else {
        sentences.push(`The transaction reference is ${cleanRef}.`);
      }
    }

    if (confidence !== undefined && confidence !== null) {
      const pct = Math.round(Number(confidence) * (Number(confidence) <= 1 ? 100 : 1));
      sentences.push(`Optical character recognition confidence is ${pct} percent.`);
    }

    if (isAuthentic === false || (fraudFlags && fraudFlags.length > 0)) {
      sentences.push(
        `Caution: forensic warning detected. ${fraudFlags.join(". ")}.`
      );
    }

    return {
      title: "Receipt Forensic Analysis",
      sentences,
    };
  }

  // Fallback to DOM extractor
  return extractPageVoiceScript();
}

/**
 * Generates an accessible, structured narrative for verification findings.
 */
export function getVerificationPageScript(data?: SpokenVerificationData | any): PageVoiceScript {
  if (data && (data.status || data.verification_status)) {
    const rawStatus = (data.status || data.verification_status || "").toUpperCase();
    const sentences: string[] = [];

    if (rawStatus === "CONFIRMED" || rawStatus === "VERIFIED" || rawStatus === "SUCCESS") {
      sentences.push(
        "Payment verified. The receipt matches the transaction received by the merchant in the bank ledger."
      );
    } else if (rawStatus === "NOT_RECEIVED" || rawStatus === "FAILED") {
      sentences.push(
        "Payment not received. No matching transaction was found in the merchant's bank account."
      );
    } else if (rawStatus === "MISMATCH" || rawStatus === "DISCREPANCY") {
      sentences.push(
        "Payment discrepancy detected. The receipt amount or details do not match the merchant's bank ledger record."
      );
    } else {
      sentences.push(`Payment verification status is ${rawStatus.toLowerCase()}.`);
    }

    if (data.reason || data.message) {
      sentences.push(`${data.reason || data.message}.`);
    }

    const expAmt = data.expected_amount ?? data.comparison?.expected_amount;
    const recAmt = data.received_amount ?? data.comparison?.received_amount;
    const rcptAmt = data.receipt_amount ?? data.comparison?.receipt_amount;

    if (expAmt) {
      sentences.push(`Expected payment amount was ${moneyToWords(expAmt, "NGN")}.`);
    }
    if (rcptAmt) {
      sentences.push(`Extracted receipt amount was ${moneyToWords(rcptAmt, "NGN")}.`);
    }
    if (recAmt) {
      sentences.push(`Settled in merchant bank account: ${moneyToWords(recAmt, "NGN")}.`);
    }

    return {
      title: "Payment Verification Findings",
      sentences,
    };
  }

  // Fallback to DOM extractor
  return extractPageVoiceScript();
}

/**
 * Landing Page Narrative Generator
 */
export function getLandingPageScript(): PageVoiceScript {
  return {
    title: "Welcome to PayPruf",
    sentences: [
      "Welcome to PayPruf. Proof beyond the receipt.",
      "PayPruf is an intelligent payment verification platform for Nigerian merchants.",
      "We combine AI receipt forensic OCR with instant Wema bank ledger cross-checking.",
      "Eliminate fake transfer receipts, confirm settlements in seconds, and protect your business revenue.",
      "Click Merchant Sign In to access your dashboard, or click Create Account to get started.",
    ],
  };
}

/**
 * Login Page Narrative Generator
 */
export function getLoginPageScript(): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length > 3) return domScript;

  return {
    title: "Merchant Sign In",
    sentences: [
      "Merchant Sign In.",
      "Sign in to manage and verify your customer payments.",
      "Choose your sign in method: Wema Account, Email, or Phone.",
      "Enter your account identifier and password.",
      "Click Sign In button to open your merchant dashboard.",
      "If you do not have an account, click Create an account.",
    ],
  };
}

/**
 * Register Page Narrative Generator
 */
export function getRegisterPageScript(): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length > 3) return domScript;

  return {
    title: "Create Merchant Account",
    sentences: [
      "Create Merchant Account.",
      "Start verifying receipts and protecting your business revenue.",
      "Enter your full name or business name, select your identification method, and create a secure password.",
      "Click Create Account button to begin merchant onboarding.",
    ],
  };
}

/**
 * Merchant Onboarding Page Narrative Generator
 */
export function getMerchantOnboardingPageScript(): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length > 3) return domScript;

  return {
    title: "Link Settlement Account",
    sentences: [
      "Link Settlement Account.",
      "Connect your Wema Bank account to verify incoming customer payments.",
      "Enter your 10 digit Wema account number, account name, and business brand name.",
      "Click Complete Setup and Open Dashboard button.",
    ],
  };
}

/**
 * Merchant Dashboard Narrative Generator
 */
export function getDashboardPageScript(dashboardData?: any): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length >= 3) {
    return domScript;
  }

  return {
    title: "Merchant Dashboard",
    sentences: [
      "Merchant Dashboard overview.",
      "Here you can monitor verified payment volume, review pending settlements, and track payment verifications.",
      "Click Create Payment button to generate new customer payment links.",
    ],
  };
}

/**
 * Payment Link / Share Page Narrative Generator
 */
export function getPaymentLinkPageScript(data?: any): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length >= 3) {
    return domScript;
  }

  return {
    title: "Payment Link Summary",
    sentences: [
      "Payment link ready.",
      "Share this payment link with your customer so they can transfer the funds and upload their payment proof.",
      "Use Copy Link or Share via WhatsApp buttons.",
    ],
  };
}

/**
 * Customer Payment Page Narrative Generator
 */
export function getCustomerPaymentPageScript(data?: any): PageVoiceScript {
  const domScript = extractPageVoiceScript();
  if (domScript.sentences.length >= 3) {
    return domScript;
  }

  return {
    title: "Customer Payment Portal",
    sentences: [
      "Customer Payment Portal.",
      "Please complete your bank transfer using the account details provided.",
      "After transferring, upload your payment receipt or screenshot to initiate instant verification.",
      "Click Verify Payment button when ready.",
    ],
  };
}

/**
 * Generic route-based script resolver that inspects the current window location
 * and returns the best script with prioritized DOM extraction.
 */
export function getScriptForCurrentRoute(pathname: string = typeof window !== "undefined" ? window.location.pathname : "/"): PageVoiceScript {
  if (pathname === "/") return getLandingPageScript();
  if (pathname === "/login") return getLoginPageScript();
  if (pathname === "/register") return getRegisterPageScript();
  if (pathname === "/merchant-onboarding") return getMerchantOnboardingPageScript();
  if (pathname.startsWith("/dashboard")) return getDashboardPageScript();
  if (pathname.startsWith("/pay/")) return getCustomerPaymentPageScript();
  if (pathname.startsWith("/share/")) return getPaymentLinkPageScript();
  if (pathname.startsWith("/verification/")) return getVerificationPageScript();
  if (pathname.startsWith("/payments/")) return getReceiptScript();

  // Universal dynamic DOM extractor for all other views, modals, and error pages
  return extractPageVoiceScript();
}
