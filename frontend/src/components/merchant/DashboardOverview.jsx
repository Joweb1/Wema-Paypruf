import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  ShieldCheck, 
  Plus, 
  ArrowUpRight, 
  RefreshCw,
  Building2,
  ScanLine,
  Activity,
  CreditCard
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceGauge } from '../common/ConfidenceGauge';

export const DashboardOverview = () => {
  const { 
    summary, 
    transactions, 
    loading, 
    refreshData, 
    setIsCreatePaymentOpen, 
    setInspectingReceiptTx, 
    setInspectingTimelineTx,
    setActivePublicToken,
    setCurrentView 
  } = useApp();

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner / Merchant Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-purple-700/80 text-purple-100 border border-purple-400/30">
              Live Gateway Active
            </span>
            <span className="text-xs text-purple-200">Wema ALAT NIP Reconciliations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Apex Luxe Retail Ltd
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 max-w-xl">
            Automated bank transfer matching, instant dynamic account issuing, and AI fraud OCR inspection engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshData()}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/15 transition-all"
            title="Refresh transactions"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsCreatePaymentOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-purple-900 font-extrabold text-xs shadow-lg hover:bg-purple-50 transition-all hover:scale-102"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>New Payment Request</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Settled Volume */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Settled Inflows
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatCurrency(summary?.totalVolume || 0)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-1">
              <span>{summary?.confirmedCount || 0} confirmed</span>
              <span className="text-slate-400">•</span>
              <span>{summary?.successRate.toFixed(0)}% clearance rate</span>
            </div>
          </div>
        </div>

        {/* 2. Pending Verification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Awaiting Inflows
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {summary?.pendingCount || 0}
            </div>
            <div className="text-xs text-amber-700 font-semibold mt-1">
              Active dynamic virtual accounts
            </div>
          </div>
        </div>

        {/* 3. Mismatches & Underpayments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Amount Mismatches
            </span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {summary?.mismatchCount || 0}
            </div>
            <div className="text-xs text-orange-700 font-semibold mt-1">
              Requires compliance shortfall review
            </div>
          </div>
        </div>

        {/* 4. AI Fraud Quarantined */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tampered / Quarantined
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertOctagon size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {summary?.flaggedTamperingCount || 0}
            </div>
            <div className="text-xs text-rose-700 font-semibold mt-1">
              Flagged by ML heuristics engine
            </div>
          </div>
        </div>
      </div>

      {/* Middle Split: Bank Gateway Status + ML Neural Engine Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Recent Ledger */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-purple-700" />
              <h2 className="text-base font-bold text-slate-900">
                Recent Reconciliations & Transactions
              </h2>
            </div>
            <button
              onClick={() => setCurrentView('transactions')}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              <span>View All ({transactions.length})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Virtual Account</th>
                    <th className="py-3 px-4">ML Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {tx.reference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{tx.customerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tx.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-purple-950 font-bold">
                          {tx.assignedVirtualAccount.accountNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tx.assignedVirtualAccount.bankName.split(' ')[0]}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {tx.receipt?.confidence ? (
                          <ConfidenceGauge score={tx.receipt.confidence} compact />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No receipt</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.receipt && (
                            <button
                              onClick={() => setInspectingReceiptTx(tx)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                            >
                              Scan
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActivePublicToken(tx.token);
                              setCurrentView('public_checkout');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Preview Customer Checkout"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right (4 cols): Bank Virtual Account Feed Status & Real-time OCR Engine */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Gateway Settlement Node
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            {/* Core Bank Connection Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Settlement Partner:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Building2 size={13} className="text-purple-700" />
                  Wema Bank ALAT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">NIP Webhook Ping:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Connected (24ms)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">OCR Heuristic Engine:</span>
                <span className="font-mono font-bold text-purple-900 text-[11px]">
                  v3.8 Anti-Fraud
                </span>
              </div>
            </div>

            {/* Fraud Prevention Summary Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Automated Safeguards Active
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Instant Virtual Accounts:</strong> Unique 10-digit NIP numbers created per checkout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>AI Font Kerning Analysis:</strong> Detects altered digits and fake PDF stamps in seconds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>NIP Check-Digit Match:</strong> Automatic matching against central Nigerian bank clearing feeds.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setCurrentView('verification_hub')}
              className="w-full py-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ScanLine size={15} />
              <span>Open ML Verification Hub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
