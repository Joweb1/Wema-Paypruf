# PayPruf Voice Reader — Integration Guide

## A. What was created

```
src/
├── components/accessibility/
│   ├── PayPrufVoiceReader.tsx   # floating accessibility panel (voice, rate, live region)
│   ├── PageVoiceButton.tsx      # lightweight reusable "read this page" button
│   └── ReceiptVoiceButton.tsx   # reads a live ML receipt-extraction result
├── hooks/
│   └── usePayPrufVoice.ts       # voice state + speak/pause/resume/stop controller
├── utils/
│   ├── numberToWords.ts         # naira amounts, digit-by-digit refs, dates, times, masked accounts
│   ├── speechSynthesis.ts       # voice selection + Nigerian pronunciation normalizer + speech queue
│   └── spokenScripts.ts         # generateDashboardSpokenScript / PaymentPage / Receipt / Verification
└── types/
    └── accessibility.ts         # ReceiptClaim, DashboardSummary, PaymentPageData, VerificationResult
```

Nothing here touches the ML pipeline or backend. It's a self-contained module under `src/`.

## B. What to modify in your existing app

Nothing is *required* to change except adding imports where you want the buttons/panel to appear. Typical placements:

1. **`frontend/src/App.tsx`** (or your root layout) — mount one `<PayPrufVoiceReader>` globally, OR mount page-specific `<PageVoiceButton>` instances per route. Pick one pattern; don't mix both on the same page.
2. **Dashboard page component** — pass a `getScript` that builds a `DashboardSummary` from whatever state/query you already have and calls `generateDashboardSpokenScript`.
3. **Customer payment page component** — same pattern with `generatePaymentPageSpokenScript`.
4. **Receipt analysis page component** — render `<ReceiptVoiceButton receiptData={mlResponse} />` right next to wherever you already display the extracted fields.
5. **Verification result page component** — same pattern with `generateVerificationSpokenScript`.

## C. How the speech system works

```
PayPruf data (dashboard state / receipt JSON / verification result)
        ↓
spoken script generator (utils/spokenScripts.ts)   → ordered array of plain-English sentences
        ↓
Nigerian pronunciation normalizer (normalizeForNigerianSpeech)  → per-sentence, right before speaking
        ↓
browser SpeechSynthesis (utils/speechSynthesis.ts → speakSentences)
        ↓
audio output, with sentence-by-sentence progress reported back to the UI's live region
```

The normalizer runs **per sentence at speak time**, not when the script is generated — so the "current sentence" shown in the panel stays human-readable, while the audio gets the phonetic version.

## D. How Nigerian voice selection works

`getBestPayPrufVoice()` inspects `window.speechSynthesis.getVoices()` and picks, in order:

1. A voice whose `lang` or `name` actually indicates Nigerian English (`en-NG`, or "Nigeria" in the name)
2. `en-GB`
3. `en-ZA`
4. `en-US`
5. Any `en-*` voice
6. The device's default voice

The panel is honest about which tier it landed on ("Voice: Nigerian English" vs. "Voice: English (UK fallback)", etc.) — it never claims a Nigerian accent that isn't actually present. Because `getVoices()` can return an empty list on first paint (especially in Chromium browsers), `getAvailableVoices()` waits for the `voiceschanged` event (with a 1s safety-net timeout) before resolving.

## E. Connecting real ML/backend data — exact example

```tsx
// ReceiptAnalysisPage.tsx
import { ReceiptVoiceButton } from "@/components/accessibility/ReceiptVoiceButton";

function ReceiptAnalysisPage() {
  const { data: receipt } = useReceiptExtraction(); // however you already fetch it
  // receipt already matches ReceiptClaim's shape (amount, currency,
  // transaction_reference, transaction_date, transaction_time,
  // sender_name, recipient_name, sender_account, recipient_account,
  // bank_name, transaction_type, narration)

  return (
    <div>
      {/* ...existing receipt display... */}
      {receipt && <ReceiptVoiceButton receiptData={receipt} />}
    </div>
  );
}
```

```tsx
// VerificationResultPage.tsx
import { usePayPrufVoice } from "@/hooks/usePayPrufVoice";
import { generateVerificationSpokenScript } from "@/utils/spokenScripts";

function VerificationResultPage() {
  const { data: result } = useVerificationResult(); // existing fetch
  const { speak, stop, isSpeaking } = usePayPrufVoice();

  return (
    <div>
      {/* ...existing result display... */}
      <button onClick={() => (isSpeaking ? stop() : speak(generateVerificationSpokenScript(result)))}>
        {isSpeaking ? "⏹ Stop" : "🔊 Read Result"}
      </button>
    </div>
  );
}
```

```tsx
// DashboardPage.tsx
import { PayPrufVoiceReader } from "@/components/accessibility/PayPrufVoiceReader";
import { generateDashboardSpokenScript } from "@/utils/spokenScripts";

function DashboardPage() {
  const { data: summary } = useDashboardSummary(); // existing fetch

  return (
    <div>
      {/* ...existing dashboard UI... */}
      <PayPrufVoiceReader
        pageLabel="Dashboard"
        getScript={() => generateDashboardSpokenScript(summary)}
      />
    </div>
  );
}
```

(Adjust the `@/` alias to whatever path alias — or relative path — your Vite config already uses.)

## F. How to run it

```bash
# from your existing frontend/ directory
cp -r path/to/paypruf-voice-reader/src/components/accessibility frontend/src/components/
cp -r path/to/paypruf-voice-reader/src/hooks/usePayPrufVoice.ts frontend/src/hooks/
cp -r path/to/paypruf-voice-reader/src/utils/{numberToWords,speechSynthesis,spokenScripts}.ts frontend/src/utils/
cp path/to/paypruf-voice-reader/src/types/accessibility.ts frontend/src/types/

cd frontend
npm install   # no new dependencies were added — this is just your existing install
npm run dev
```

No new npm packages are required. Everything uses the browser's built-in Web Speech API.

## G. 5-minute test checklist

1. Load the dashboard → click **🔊 Read this page** → confirm it reads the counts you actually see on screen (not placeholder numbers).
2. While it's speaking, click **⏸ Pause**, then **▶ Resume** → confirm playback picks up rather than restarting.
3. Click **⏹ Stop**, then press `Escape` while speech is running → confirm both stop it.
4. On a receipt analysis page with a real extraction result, click **🔊 Read Receipt** → confirm the reference number is read digit-by-digit, not as one huge number, and that the amount says "naira" rather than "NGN".
5. Open the voice selector → confirm the label under it says either "Nigerian English" or an honest fallback label (never claims Nigerian if none is available) — check on a device/browser that does have an `en-NG` voice if you have one, to confirm the upgrade path.
6. Trigger a verification result of each status (confirmed / mismatch / not received / provider unavailable) and confirm each is read with the wording from the spec, including the "do not assume success" line for provider failures.

## H. Known limitations (be upfront about these in the demo)

- **No Nigerian voice on most judging laptops.** Chrome/Edge/Firefox on Windows and macOS typically ship zero `en-NG` voices as of today. The panel will show an honest fallback label (e.g. "English (UK fallback)") and rely on the pronunciation normalizer rather than an actual accent. iOS Safari sometimes has more regional voices installed at the OS level — worth checking on an iPhone/iPad if one is available for the demo.
- **Normalizer covers only the terms in the spec** (OPay, Wema, NIBSS, BVN, NIN, NGN/₦, masked accounts, 24-hour times). Other bank names or new fintech terms won't get special phonetic treatment until added to `normalizeForNigerianSpeech`.
- **No offline/audio-file fallback.** If `window.speechSynthesis` is unavailable (some embedded webviews, very old browsers), the feature shows "Voice reading is not available on this device" rather than falling back to a server-rendered audio file — that would require new backend infrastructure, which is out of scope per the hackathon constraints.
- **Not a general DOM reader.** By design (per the spec) it only speaks the four structured scripts — dashboard, payment page, receipt, verification. Any other page content won't be read unless you write a new script generator for it.
- **Sentence-boundary reporting uses utterance boundaries, not word-level `onboundary` events**, since word-level boundary support is inconsistent across browsers. The live region updates per sentence, not per word.
