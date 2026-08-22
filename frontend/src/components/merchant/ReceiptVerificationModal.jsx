import React, { useState } from 'react';
import { 
  X, 
  ScanLine, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  FileText, 
  Building2, 
  Calendar, 
  Clock, 
  Check, 
  XCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfidenceGauge } from '../common/ConfidenceGauge';
import { AIOfflineNotice, AIEngineBadge } from '../common/AIOfflineNotice';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

export const ReceiptVerificationModal = () => {
  const { inspectingReceiptTx, setInspectingReceiptTx, handleManualOverride } = useApp();
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  if (!inspectingReceiptTx) return null;

  const tx = inspectingReceiptTx;
  const receipt = tx.receipt;

  if (!receipt) return null;

  const handleApprove = async () => {
    await handleManualOverride(tx.id, 'CONFIRMED', overrideReason || 'Approved via Deep Scan OCR Modal');
    setInspectingReceiptTx(null);
  };

  const handleReject = async () => {
    await handleManualOverride(tx.id, 'NOT_RECEIVED', overrideReason || 'Rejected: Failed OCR authenticity criteria');
    setInspectingReceiptTx(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <ScanLine size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  ML Receipt Deep Scan & Fraud Analysis
                </h3>
                <StatusBadge status={tx.status} size="sm" />
                <AIEngineBadge receipt={receipt} />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Ref: {tx.reference} • Payer: {tx.customerName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setInspectingReceiptTx(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Image Scan, Right: ML Heuristics & OCR Text) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column (5 cols): Attached Proof of Payment Document */}
          <div className="lg:col-span-5 p-6 bg-slate-900 flex flex-col justify-between text-white space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold flex items-center gap-1">
                  <FileText size={14} className="text-purple-400" />
                  {receipt.fileName}
                </span>
                <span className="text-[10px] font-mono">Scanned: {formatDate(receipt.uploadedAt)}</span>
              </div>

              {/* Receipt Image Display */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative group">
                <img
                  src={receipt.fileUrl}
                  alt="Receipt Preview"
                  className="w-full max-h-[360px] object-contain mx-auto"
                />
              </div>
            </div>

            {/* Raw OCR Text Box */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                Extracted Neural OCR Buffer
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {receipt.ocrRawText}
              </pre>
            </div>
          </div>

          {/* Right Column (7 cols): Fraud Heuristics & Reconciled Fields */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto">
            <AIOfflineNotice receipt={receipt} />

            {/* Confidence Score Bar */}
            <ConfidenceGauge score={receipt.confidence} />

            {/* Matched Data Matrix vs Expected Order */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cross-Field Reconciliation Matrix
              </h4>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
                {/* Amount Row */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Transfer Amount:</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {receipt.extractedAmount ? formatCurrency(receipt.extractedAmount, tx.currency) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Expected: {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                </div>

                {/* Sender Name Row */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Extracted Payer:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      {receipt.extractedSenderName || 'UNSPECIFIED'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Order Name: {tx.customerName}
                    </span>
                  </div>
                </div>

                {/* Bank & Session ID */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Originating Bank:</span>
                  <span className="font-semibold text-slate-900">
                    {receipt.extractedSenderBank || 'Direct Transfer'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">NIP Session ID:</span>
                  <span className="font-mono text-[11px] text-purple-950 font-bold truncate max-w-[200px]">
                    {receipt.extractedSessionId || receipt.extractedReference}
                  </span>
                </div>
              </div>
            </div>

            {/* Compliance Override Section */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-purple-700" />
                  Compliance & Settlement Decision
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check size={16} className="stroke-[3]" />
                  <span>Accept & Confirm (Mark Settle)</span>
                </button>

                <button
                  onClick={handleReject}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <XCircle size={16} />
                  <span>Reject (Flag Fraud)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
