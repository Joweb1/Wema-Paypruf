export type VoiceReaderStatus = 'idle' | 'speaking' | 'paused' | 'stopped' | 'error';

export interface VoiceReaderOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceUri?: string;
  preferNigerian?: boolean;
}

export interface VoiceInfo {
  voice?: SpeechSynthesisVoice | null;
  name: string;
  lang: string;
  isNigerian: boolean;
  displayName: string;
  isDefault: boolean;
}

export interface SpokenReceiptData {
  amount?: number | string;
  currency?: string;
  sender_name?: string;
  recipient_name?: string;
  bank?: string;
  reference?: string;
  transaction_date?: string;
  confidence?: number;
  status?: string;
  message?: string;
  warnings?: string[];
  mismatch_details?: string[];
  raw_text?: string;
  original_filename?: string;
}

export interface SpokenVerificationData {
  status: string;
  reason?: string;
  amount_match?: boolean;
  expected_amount?: number | string;
  received_amount?: number | string;
  receipt_amount?: number | string;
  merchant_name?: string;
  reference?: string;
  comparison?: {
    expected_amount?: number | string;
    receipt_amount?: number | string;
    received_amount?: number | string;
  };
}

export interface PageVoiceScript {
  title: string;
  sentences: string[];
  summary?: string;
}
