import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  ScanLine, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, copyToClipboard } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceGauge } from '../common/ConfidenceGauge';

export const TransactionsList = () => {
  const { 
    transactions, 
    searchQuery, 
    setSearchQuery, 
    statusFilter, 
    setStatusFilter,
    setInspectingReceiptTx,
    setInspectingTimelineTx,
    setActivePublicToken,
    setCurrentView,
    addToast,
    handleManualOverride
  } = useApp();

  const [copiedToken, setCopiedToken] = useState(null);
  const [selectedTxForOverride, setSelectedTxForOverride] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('CONFIRMED');
  const [overrideReason, setOverrideReason] = useState('Verified in bank statement manually');

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch = 
      tx.reference.toLowerCase().includes(q) ||
      tx.token.toLowerCase().includes(q) ||
      tx.customerName.toLowerCase().includes(q) ||
      tx.customerEmail.toLowerCase().includes(q) ||
      tx.assignedVirtualAccount.accountNumber.includes(q) ||
      tx.amount.toString().includes(q);

    return matchesStatus && matchesSearch;
  });

  const handleCopyLink = async (tx) => {
    const url = `${window.location.origin}/#/pay/${tx.token}`;
    await copyToClipboard(url);
    setCopiedToken(tx.token);
    addToast('Checkout Link Copied', `Copied payment link for ${tx.reference}`, 'success');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Reference', 'Token', 'Customer', 'Email', 'Amount', 'Currency', 'Status', 'VirtualAccount', 'Bank', 'CreatedAt'];
    const rows = filtered.map((t) => [
      t.reference,
      t.token,
      `"${t.customerName}"`,
      t.customerEmail,
      t.amount,
      t.currency,
      t.status,
      t.assignedVirtualAccount.accountNumber,
      `"${t.assignedVirtualAccount.bankName}"`,
      t.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paypruf_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported', `Exported ${filtered.length} transactions`, 'info');
  };

  const statuses = [
    'ALL',
    'CONFIRMED',
    'PENDING',
    'MISMATCH',
    'NOT_RECEIVED',
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Transaction Ledger & Reconciliations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time payments, dynamic virtual accounts, and proof-of-payment receipts
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold shadow-2xs hover:bg-slate-50 transition-colors self-start sm:self-auto"
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, token, customer name, email, or account number..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>Showing <strong>{filtered.length}</strong> of {transactions.length} total records</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-purple-700 font-semibold hover:underline"
            >
              Clear search query
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Transaction / Token</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Expected / Paid</th>
                <th className="py-3.5 px-4">Virtual Account</th>
                <th className="py-3.5 px-4">ML Verification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No transactions match your search criteria</p>
                    <p className="text-xs mt-1">Try adjusting the filter or search query</p>
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reference & Token */}
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-slate-900">{tx.reference}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {tx.token}
                        </span>
                        <button
                          onClick={() => handleCopyLink(tx)}
                          className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-colors"
                          title="Copy public payment link"
                        >
                          {copiedToken === tx.token ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{tx.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tx.customerEmail}</div>
                      {tx.customerPhone && (
                        <div className="text-[10px] text-slate-400">{tx.customerPhone}</div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      {tx.paidAmount !== undefined && tx.paidAmount !== tx.amount && (
                        <div className="text-[10px] font-bold text-rose-600">
                          Paid: {formatCurrency(tx.paidAmount, tx.currency)}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        Fee: {formatCurrency(tx.fee, tx.currency)}
                      </div>
                    </td>

                    {/* Virtual Account */}
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-purple-950">
                        {tx.assignedVirtualAccount.accountNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {tx.assignedVirtualAccount.bankName}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[120px]">
                        {tx.assignedVirtualAccount.accountName}
                      </div>
                    </td>

                    {/* ML Verification Gauge */}
                    <td className="py-4 px-4">
                      {tx.receipt?.confidence ? (
                        <div className="space-y-1">
                          <ConfidenceGauge score={tx.receipt.confidence} compact />
                          <button
                            onClick={() => setInspectingReceiptTx(tx)}
                            className="text-[10px] text-purple-700 font-bold hover:underline flex items-center gap-0.5"
                          >
                            <span>Inspect Scan</span>
                            <ChevronRight size={11} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No receipt attached</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      <StatusBadge status={tx.status} size="sm" />
                      {tx.manualOverrideBy && (
                        <div className="text-[9px] text-purple-700 font-semibold mt-1 flex items-center gap-0.5">
                          <UserCheck size={10} /> Override by {tx.manualOverrideBy}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {tx.receipt && (
                          <button
                            onClick={() => setInspectingReceiptTx(tx)}
                            className="px-2 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                            title="Inspect ML OCR Scan"
                          >
                            <ScanLine size={13} className="inline mr-1" />
                            OCR
                          </button>
                        )}
                        <button
                          onClick={() => setInspectingTimelineTx(tx)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Audit Trail Timeline"
                        >
                          <Clock size={15} />
                        </button>
                        <button
                          onClick={() => setSelectedTxForOverride(tx)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors"
                          title="Manual Status Override"
                        >
                          <UserCheck size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setActivePublicToken(tx.token);
                            setCurrentView('public_checkout');
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors"
                          title="Preview Customer Checkout"
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Status Override Modal */}
      {selectedTxForOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manual Status Override (Compliance Audit)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Override status for <strong className="font-mono text-purple-950">{selectedTxForOverride.reference}</strong>
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{selectedTxForOverride.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedTxForOverride.amount, selectedTxForOverride.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <StatusBadge status={selectedTxForOverride.status} size="sm" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Target Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                >
                  <option value="CONFIRMED">CONFIRMED (Approve payment)</option>
                  <option value="MISMATCH">MISMATCH (Flag for underpayment/dispute)</option>
                  <option value="NOT_RECEIVED">NOT_RECEIVED (Reject / No Bank Inflow)</option>
                  <option value="PENDING">PENDING (Reset to Waiting)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Trail Reason / Notes</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this status was modified (e.g., Verified on physical Wema bank portal)..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedTxForOverride(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleManualOverride(selectedTxForOverride.id, overrideStatus, overrideReason);
                  setSelectedTxForOverride(null);
                }}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
