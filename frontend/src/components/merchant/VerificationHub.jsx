import React, { useState } from 'react';
import { 
  ScanLine, 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Check, 
  Clock, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfidenceGauge } from '../common/ConfidenceGauge';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const VerificationHub = () => {
  const { transactions, setInspectingReceiptTx, handleManualOverride } = useApp();
  const [riskFilter, setRiskFilter] = useState('ALL');

  const transactionsWithReceipts = transactions.filter((t) => !!t.receipt);

  const filtered = transactionsWithReceipts.filter((t) => {
    if (riskFilter === 'ALL') return true;
    return t.receipt?.confidence?.tamperingRisk === riskFilter;
  });

  const highRiskCount = transactionsWithReceipts.filter(
    (t) => t.receipt?.confidence?.tamperingRisk === 'HIGH' || t.receipt?.confidence?.tamperingRisk === 'CRITICAL'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ML Verification Hub
            </h1>
            <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
              Neural OCR Engine v3.8
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated image heuristics, bank stamp authenticity, and NIP session ID verification matrix
          </p>
        </div>

        {/* Risk Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((risk) => (
            <button
              key={risk}
              onClick={() => setRiskFilter(risk)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                riskFilter === risk
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {risk === 'ALL' ? `All Scans (${transactionsWithReceipts.length})` : risk}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {transactionsWithReceipts.filter((t) => t.receipt?.confidence?.tamperingRisk === 'LOW').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold">Clean / Low Risk Scans</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {transactionsWithReceipts.filter((t) => t.receipt?.confidence?.tamperingRisk === 'MEDIUM').length}
            </div>
            <div className="text-xs text-slate-500 font-semibold">Medium Discrepancy Warnings</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertOctagon size={24} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{highRiskCount}</div>
            <div className="text-xs text-slate-500 font-semibold">Critical Forgeries / Shortfalls</div>
          </div>
        </div>
      </div>

      {/* Grid of Inspected Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <ScanLine size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No receipts match this risk filter.</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const r = tx.receipt;
            return (
              <div
                key={tx.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {tx.reference}
                      </span>
                      <StatusBadge status={tx.status} size="sm" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{tx.customerName}</h3>
                    <p className="text-xs text-slate-500">{tx.customerEmail}</p>
                  </div>

                  <button
                    onClick={() => setInspectingReceiptTx(tx)}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                  >
                    <span>Full Deep Scan</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Split: Mini Image preview + ML Confidence Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div 
                    onClick={() => setInspectingReceiptTx(tx)}
                    className="sm:col-span-4 bg-slate-950 rounded-xl overflow-hidden cursor-pointer relative group flex items-center justify-center h-28 border border-slate-800"
                  >
                    <img
                      src={r.fileUrl}
                      alt="Receipt"
                      className="max-h-full object-contain group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-purple-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      <ScanLine size={16} className="mr-1" />
                      Zoom
                    </div>
                  </div>

                  <div className="sm:col-span-8 space-y-2">
                    <ConfidenceGauge score={r.confidence} />
                  </div>
                </div>

                {/* Extracted Metadata Summary */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Extracted Amount:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {r.extractedAmount ? formatCurrency(r.extractedAmount, tx.currency) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sending Bank:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {r.extractedSenderBank || 'Direct Transfer'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NIP Session:</span>
                    <span className="font-mono text-[11px] text-purple-950 truncate max-w-[180px]">
                      {r.extractedSessionId || r.extractedReference}
                    </span>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Scanned {formatDate(r.uploadedAt)}
                  </span>

                  <div className="flex gap-2">
                    {tx.status !== 'CONFIRMED' && (
                      <button
                        onClick={() => handleManualOverride(tx.id, 'CONFIRMED', 'Approved in Verification Hub')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Check size={13} className="stroke-[3]" />
                        <span>Approve</span>
                      </button>
                    )}
                    {tx.status !== 'NOT_RECEIVED' && (
                      <button
                        onClick={() => handleManualOverride(tx.id, 'NOT_RECEIVED', 'Rejected: Failed OCR criteria')}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
