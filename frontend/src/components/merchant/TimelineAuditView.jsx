import React, { useState } from 'react';
import { 
  History, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  ExternalLink,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

export const TimelineAuditView = () => {
  const { transactions, inspectingTimelineTx, setInspectingTimelineTx, setActivePublicToken, setCurrentView } = useApp();
  const [selectedTxId, setSelectedTxId] = useState(
    inspectingTimelineTx ? inspectingTimelineTx.id : transactions[0]?.id || ''
  );

  const activeTx = transactions.find((t) => t.id === selectedTxId) || transactions[0];

  const getEventIcon = (type) => {
    switch (type) {
      case 'CREATED':
        return <CreditCard size={15} className="text-purple-600" />;
      case 'RECEIPT_UPLOADED':
        return <FileText size={15} className="text-blue-600" />;
      case 'OCR_ANALYSIS_COMPLETED':
        return <ShieldCheck size={15} className="text-indigo-600" />;
      case 'BANK_FEED_MATCHED':
        return <CheckCircle2 size={15} className="text-emerald-600" />;
      case 'WEBHOOK_DISPATCHED':
        return <Send size={15} className="text-sky-600" />;
      case 'MANUALLY_OVERRIDDEN':
        return <UserCheck size={15} className="text-amber-600" />;
      default:
        return <Clock size={15} className="text-slate-600" />;
    }
  };

  const getActorBadge = (actor) => {
    switch (actor) {
      case 'ML Engine':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">ML Engine</span>;
      case 'Bank Feed':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Wema NIP</span>;
      case 'Customer':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Customer</span>;
      case 'Merchant':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Merchant Staff</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">System</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Lifecycle Audit Trail & Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of state transitions, webhook dispatches, and OCR analysis
          </p>
        </div>

        {activeTx && (
          <button
            onClick={() => {
              setActivePublicToken(activeTx.token);
              setCurrentView('public_checkout');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <span>Open Customer Link</span>
            <ExternalLink size={14} />
          </button>
        )}
      </div>

      {/* Main Split: Transaction Selector + Timeline Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (4 cols): Select Transaction */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Select Transaction ({transactions.length})
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {transactions.map((tx) => {
              const isSelected = activeTx?.id === tx.id;
              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-purple-50/80 border-l-4 border-l-purple-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{tx.reference}</span>
                      <StatusBadge status={tx.status} size="sm" showIcon={false} />
                    </div>
                    <p className="text-xs text-slate-700 font-semibold truncate mt-0.5">{tx.customerName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{formatDate(tx.createdAt)}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <span className="text-[10px] text-purple-700 font-medium">
                      {tx.timeline.length} events
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right (8 cols): Selected Timeline Audit Stream */}
        <div className="lg:col-span-8 space-y-4">
          {activeTx ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Summary Header for selected Tx */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">{activeTx.reference}</span>
                    <StatusBadge status={activeTx.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Customer: <strong className="text-slate-800">{activeTx.customerName}</strong> ({activeTx.customerEmail})
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">
                    {formatCurrency(activeTx.amount, activeTx.currency)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Virtual Acc: {activeTx.assignedVirtualAccount.accountNumber} ({activeTx.assignedVirtualAccount.bankName})
                  </div>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {activeTx.timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative flex items-start gap-4">
                    {/* Event Icon Pin */}
                    <div className="relative z-10 w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs shrink-0">
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event Box */}
                    <div className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-purple-200 transition-colors space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{event.title}</h4>
                          {getActorBadge(event.actor)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {event.description}
                      </p>

                      {event.metadata && (
                        <div className="mt-2 p-2 rounded bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600">
                          <pre className="overflow-x-auto">{JSON.stringify(event.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <History size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Select a transaction to inspect its lifecycle audit trail</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TimelineModal = () => {
  const { inspectingTimelineTx, setInspectingTimelineTx } = useApp();

  if (!inspectingTimelineTx) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Audit Timeline: {inspectingTimelineTx.reference}
              </h3>
              <p className="text-xs text-slate-500">
                {inspectingTimelineTx.customerName} - {formatCurrency(inspectingTimelineTx.amount, inspectingTimelineTx.currency)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setInspectingTimelineTx(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {inspectingTimelineTx.timeline.map((event, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <div className="relative z-10 w-6 h-6 rounded-full bg-white border-2 border-purple-600 flex items-center justify-center shadow-xs shrink-0">
                  <div className="w-2 h-2 rounded-full bg-purple-600" />
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{event.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(event.timestamp)}</span>
                  </div>
                  <p className="text-slate-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
