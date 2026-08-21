import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Clock, 
  Building2,
  CheckCircle2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, copyToClipboard } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

export const PaymentLinksManager = () => {
  const { 
    transactions, 
    setIsCreatePaymentOpen, 
    setActivePublicToken, 
    setCurrentView,
    addToast 
  } = useApp();

  const [copiedToken, setCopiedToken] = useState(null);
  const [selectedTxForQr, setSelectedTxForQr] = useState(null);

  const handleCopyLink = async (tx) => {
    const url = `${window.location.origin}/#/pay/${tx.token}`;
    await copyToClipboard(url);
    setCopiedToken(tx.token);
    addToast('Link Copied', `Payment link for ${tx.reference} copied`, 'info');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Active Payment Links & Virtual Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic checkout URLs with dedicated Nigerian Interbank Settlement (NIP) virtual accounts
          </p>
        </div>

        <button
          onClick={() => setIsCreatePaymentOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all self-start sm:self-auto"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>Generate New Link</span>
        </button>
      </div>

      {/* Grid of Link Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {transactions.map((tx) => {
          const isCopied = copiedToken === tx.token;
          const checkoutUrl = `${window.location.origin}/#/pay/${tx.token}`;

          return (
            <div
              key={tx.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-purple-200 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Top Meta */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {tx.reference}
                  </span>
                  <StatusBadge status={tx.status} size="sm" />
                </div>

                <div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                    {tx.customerName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{tx.customerEmail}</p>
                </div>

                {/* Virtual Account Box inside card */}
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-900 font-semibold flex items-center gap-1">
                      <Building2 size={12} className="text-purple-700" />
                      {tx.assignedVirtualAccount.bankName.split(' ')[0]}
                    </span>
                    <span className="font-mono font-bold text-purple-950">
                      {tx.assignedVirtualAccount.accountNumber}
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-700 truncate">
                    Beneficiary: {tx.assignedVirtualAccount.accountName}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(tx)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedTxForQr(tx)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                    title="View QR Code"
                  >
                    <QrCode size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setActivePublicToken(tx.token);
                      setCurrentView('public_checkout');
                    }}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors border border-purple-200"
                    title="Open Checkout Portal"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center">
                  Created {formatDate(tx.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Modal */}
      {selectedTxForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Payment QR: {selectedTxForQr.reference}
              </h3>
              <button
                onClick={() => setSelectedTxForQr(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              {/* Simulated stylized QR canvas block */}
              <div className="w-48 h-48 bg-white border-2 border-slate-900 rounded-xl p-2 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-4 border-slate-900 rounded-xs" />
                  <div className="w-10 h-10 border-4 border-slate-900 rounded-xs" />
                </div>
                <div className="text-center font-mono text-[9px] text-slate-700 font-bold">
                  PAYPRUF INSTANT SCAN
                  <div className="text-purple-700 font-black text-xs mt-1">
                    {formatCurrency(selectedTxForQr.amount, selectedTxForQr.currency)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-4 border-slate-900 rounded-xs" />
                  <div className="w-10 h-10 bg-purple-700 rounded-xs flex items-center justify-center text-white text-[9px] font-bold">
                    NIP
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">{selectedTxForQr.assignedVirtualAccount.bankName}</p>
              <p className="font-mono text-sm font-black text-purple-950">
                {selectedTxForQr.assignedVirtualAccount.accountNumber}
              </p>
              <p className="text-[11px] text-slate-400">
                Account Name: {selectedTxForQr.assignedVirtualAccount.accountName}
              </p>
            </div>

            <button
              onClick={() => setSelectedTxForQr(null)}
              className="w-full py-2.5 rounded-xl bg-purple-700 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
