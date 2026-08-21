import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PayprufApi } from '../../services/api';
import { formatCurrency, copyToClipboard } from '../../utils/formatters';

export const CreatePaymentModal = () => {
  const { 
    isCreatePaymentOpen, 
    setIsCreatePaymentOpen, 
    refreshData, 
    addToast,
    setActivePublicToken,
    setCurrentView 
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [description, setDescription] = useState('');
  const [customRef, setCustomRef] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(1440); // 24 hours default

  const [loading, setLoading] = useState(false);
  const [createdTx, setCreatedTx] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isCreatePaymentOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !amount) {
      addToast('Missing Fields', 'Please complete all required customer & amount fields', 'warning');
      return;
    }

    try {
      setLoading(true);
      const newTx = await PayprufApi.createPaymentLink({
        customerName,
        customerEmail,
        customerPhone,
        amount: Number(amount),
        currency,
        description,
        customReference: customRef || undefined,
        expiresInMinutes: Number(expiresInMinutes),
      });

      setCreatedTx(newTx);
      await refreshData();
      addToast('Payment Link Ready', `Virtual Account assigned: ${newTx.assignedVirtualAccount.accountNumber}`, 'success');
    } catch (err) {
      addToast('Error Creating Payment', err?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setCreatedTx(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setAmount('');
    setDescription('');
    setCustomRef('');
    setIsCreatePaymentOpen(false);
  };

  const handleCopyLink = async () => {
    if (!createdTx) return;
    const url = `${window.location.origin}/#/pay/${createdTx.token}`;
    await copyToClipboard(url);
    setCopiedLink(true);
    addToast('Copied to Clipboard', 'Checkout URL ready to share with customer', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenCheckout = () => {
    if (!createdTx) return;
    setActivePublicToken(createdTx.token);
    setIsCreatePaymentOpen(false);
    setCurrentView('public_checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {createdTx ? 'Payment Link Created' : 'Create Payment / Dynamic Account'}
              </h3>
              <p className="text-xs text-slate-500">
                {createdTx 
                  ? 'Share with customer or open the checkout view' 
                  : 'Assigns a dedicated instant NIP account with AI receipt matching'}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form or Result View */}
        {!createdTx ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Adebayo Adeleke"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Customer Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-slate-50/50"
                />
              </div>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Amount to Collect <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    ₦
                  </span>
                  <input
                    type="number"
                    required
                    min="100"
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50,000"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-slate-50/50"
                >
                  <option value="NGN">NGN (₦)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Optional Description / Invoice ID */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Payment Description / Order Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Order #4491 - Leather Laptop Sleeve"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-slate-50/50"
              />
            </div>

            {/* Quick Demo Autofill Helpers */}
            <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                <span className="flex items-center gap-1">
                  <Sparkles size={13} className="text-purple-600" /> Fast Fill Templates
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('Bolanle Williams');
                    setCustomerEmail('bolanle.w@africom.ng');
                    setAmount('250000');
                    setDescription('Q3 Enterprise Software License');
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 text-[11px] font-semibold hover:bg-purple-100/60 transition-colors"
                >
                  ₦250k B2B SaaS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('Tariq Al-Mansoor');
                    setCustomerEmail('tariq@gulflogistics.ae');
                    setAmount('85000');
                    setDescription('Express Courier Airway Bill #9901');
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 text-[11px] font-semibold hover:bg-purple-100/60 transition-colors"
                >
                  ₦85k Logistics
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Generating Virtual Account...' : 'Generate Checkout Link'}
              </button>
            </div>
          </form>
        ) : (
          /* Created Success Screen */
          <div className="space-y-4 animate-scale-in">
            {/* Account Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950 text-white space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span className="flex items-center gap-1 font-semibold">
                  <Building2 size={14} className="text-purple-400" />
                  {createdTx.assignedVirtualAccount.bankName}
                </span>
                <span className="font-mono text-[10px] bg-purple-900/60 px-2 py-0.5 rounded">
                  Dynamic NIP
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-300 font-bold">
                  Virtual Account Number
                </span>
                <div className="font-mono text-2xl font-black tracking-wider text-white">
                  {createdTx.assignedVirtualAccount.accountNumber}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-800/40">
                <div>
                  <span className="text-[10px] text-purple-300 block">Beneficiary</span>
                  <span className="font-bold text-white text-xs">
                    {createdTx.assignedVirtualAccount.accountName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-purple-300 block">Amount</span>
                  <span className="font-bold text-emerald-300 text-sm font-mono">
                    {formatCurrency(createdTx.amount, createdTx.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Customer Public Payment URL
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/#/pay/${createdTx.token}`}
                  className="bg-transparent text-xs text-slate-600 font-mono flex-1 outline-hidden"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-300 text-purple-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleOpenCheckout}
                className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Test Checkout Portal</span>
                <ExternalLink size={14} />
              </button>

              <button
                onClick={resetAndClose}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
