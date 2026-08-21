import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export const ConfidenceGauge = ({ score, compact = false }) => {
  if (!score) return null;

  const { overallScore, tamperingRisk, detectedAnomalies, amountMatchScore, timestampMatchScore, bankStampAuthenticityScore } = score;

  const getScoreColor = (val) => {
    if (val >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-300 stroke-emerald-600';
    if (val >= 70) return 'text-amber-700 bg-amber-50 border-amber-300 stroke-amber-600';
    return 'text-rose-700 bg-rose-50 border-rose-300 stroke-rose-600';
  };

  const getBarColor = (val) => {
    if (val >= 90) return 'bg-emerald-600';
    if (val >= 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <ShieldCheck size={12} /> Low Risk
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <AlertTriangle size={12} /> Medium Discrepancy
          </span>
        );
      case 'HIGH':
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <AlertOctagon size={12} /> Critical / Tampered
          </span>
        );
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${getBarColor(overallScore)}`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
        <span className={`text-xs font-mono font-bold ${overallScore >= 80 ? 'text-emerald-700' : overallScore >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
          {overallScore}%
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border bg-white shadow-xs space-y-3">
      {/* Top score row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
            Receipt Authenticity Score
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {overallScore}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 100</span>
            <span className="ml-2">{getRiskBadge(tamperingRisk)}</span>
          </div>
        </div>

        {/* Circular indicator or visual seal */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-mono font-black text-base ${getScoreColor(overallScore)}`}>
          {overallScore}%
        </div>
      </div>

      {/* Breakdown mini bars */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span>Amount OCR Match</span>
          <span className="font-mono font-bold text-slate-900">{amountMatchScore}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${getBarColor(amountMatchScore)}`} style={{ width: `${amountMatchScore}%` }} />
        </div>

        <div className="flex justify-between items-center text-slate-600 pt-1">
          <span>Timestamp & Bank Session</span>
          <span className="font-mono font-bold text-slate-900">{timestampMatchScore}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${getBarColor(timestampMatchScore)}`} style={{ width: `${timestampMatchScore}%` }} />
        </div>

        <div className="flex justify-between items-center text-slate-600 pt-1">
          <span>Bank Stamp / Watermark Check</span>
          <span className="font-mono font-bold text-slate-900">{bankStampAuthenticityScore}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${getBarColor(bankStampAuthenticityScore)}`} style={{ width: `${bankStampAuthenticityScore}%` }} />
        </div>
      </div>

      {/* Anomalies Alert Box */}
      {detectedAnomalies && detectedAnomalies.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1 text-rose-900">
            <AlertOctagon size={13} /> Detected Heuristic Red Flags:
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            {detectedAnomalies.map((anom, idx) => (
              <li key={idx}>{anom}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
