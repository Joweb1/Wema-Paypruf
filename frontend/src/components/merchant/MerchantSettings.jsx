import React, { useState } from 'react';
import { 
  Building2, 
  Key, 
  Webhook, 
  ShieldCheck, 
  Sliders, 
  Copy, 
  Check, 
  Save, 
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/formatters';

export const MerchantSettings = () => {
  const { profile, updateProfile, addToast } = useApp();

  const [businessName, setBusinessName] = useState(profile.businessName);
  const [tradingName, setTradingName] = useState(profile.tradingName);
  const [email, setEmail] = useState(profile.email);
  const [rcNumber, setRcNumber] = useState(profile.rcNumber);
  const [bankName, setBankName] = useState(profile.settlementBank.bankName);
  const [accountNumber, setAccountNumber] = useState(profile.settlementBank.accountNumber);
  const [accountName, setAccountName] = useState(profile.settlementBank.accountName);
  const [webhookUrl, setWebhookUrl] = useState(profile.webhookUrl);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(profile.autoApproveThreshold);

  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = async (text, keyType) => {
    await copyToClipboard(text);
    setCopiedKey(keyType);
    addToast('Copied', `${keyType} copied to clipboard`, 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile({
      ...profile,
      businessName,
      tradingName,
      email,
      rcNumber,
      settlementBank: {
        bankName,
        accountNumber,
        accountName,
      },
      webhookUrl,
      autoApproveThreshold: Number(autoApproveThreshold),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Merchant Settings & API Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure settlement bank account, AI OCR threshold, and webhook listeners
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={18} className="text-purple-700" />
            <h2 className="text-sm font-bold text-slate-900">Corporate & Trading Entity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Registered Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Brand / Trading Name</label>
              <input
                type="text"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Settlement Notification Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">CAC Registration / RC Number</label>
              <input
                type="text"
                value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Settlement Bank Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-purple-700" />
              <h2 className="text-sm font-bold text-slate-900">Destination Settlement Account</h2>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              NIP Direct Settlement
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">NUBAN Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* AI OCR & Auto-Approval Rule Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders size={18} className="text-purple-700" />
            <h2 className="text-sm font-bold text-slate-900">
              AI OCR Confidence & Automated Approval Rules
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700">
                Minimum ML Confidence Score for Auto-Settlement:
              </label>
              <span className="font-mono text-sm font-black text-purple-700">
                {autoApproveThreshold}%
              </span>
            </div>

            <input
              type="range"
              min="70"
              max="99"
              value={autoApproveThreshold}
              onChange={(e) => setAutoApproveThreshold(Number(e.target.value))}
              className="w-full accent-purple-700"
            />

            <p className="text-[11px] text-slate-500">
              Receipts scoring <strong>{autoApproveThreshold}%</strong> or above with zero bank-stamp anomalies will be automatically marked as <code>CONFIRMED</code> without requiring manual human review.
            </p>
          </div>
        </div>

        {/* Webhooks & API Keys */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key size={18} className="text-purple-700" />
            <h2 className="text-sm font-bold text-slate-900">API Keys & Webhook Webhooks</h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Live API Key */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Live Public API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={profile.apiKeyLive}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(profile.apiKeyLive, 'Live API Key')}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
                >
                  {copiedKey === 'Live API Key' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Test API Key */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Sandbox Public API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={profile.apiKeyTest}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(profile.apiKeyTest, 'Sandbox API Key')}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
                >
                  {copiedKey === 'Sandbox API Key' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Payment Event Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/paypruf-webhook"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Save size={15} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
