import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Clock, 
  Building2, 
  UploadCloud, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  FileText, 
  Lock, 
  Download, 
  ScanLine, 
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { Brand } from '../common/Brand';
import { formatCurrency, formatDate, copyToClipboard } from '../../utils/formatters';
import { PayprufApi } from '../../services/api';

export const PublicPaymentPortal = ({ 
  tokenParam, 
  onBackToDashboard 
}) => {
  const { 
    activePublicToken, 
    transactions, 
    setCurrentView, 
    refreshData, 
    addToast 
  } = useApp();

  const token = tokenParam || activePublicToken || (transactions[0]?.token ?? 'x94b-7721');

  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Upload & Scan state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(1440 * 60); // in seconds

  useEffect(() => {
    async function load() {
      setLoading(true);
      const found = await PayprufApi.getTransactionByToken(token);
      if (found) {
        setTx(found);
        if (found.status === 'CONFIRMED') {
          setActiveTab('confirmed');
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  // Countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyAcc = async () => {
    if (!tx) return;
    await copyToClipboard(tx.assignedVirtualAccount.accountNumber);
    setCopiedAcc(true);
    addToast('Account Copied', 'Virtual account number copied to clipboard', 'info');
    setTimeout(() => setCopiedAcc(false), 2500);
  };

  const handleCopyAmount = async () => {
    if (!tx) return;
    await copyToClipboard(tx.amount.toString());
    setCopiedAmount(true);
    addToast('Amount Copied', `₦${tx.amount.toLocaleString()} copied to clipboard`, 'info');
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7e22ce', '#10b981', '#6366f1', '#f59e0b'],
      });
    } catch {
      // ignore
    }
  };

  const handleUploadReceipt = async (sampleType = 'perfect') => {
    if (!tx) return;
    setIsUploading(true);
    setUploadStep(1); // Uploading

    const fileSample = {
      name: sampleType === 'forged' ? 'kuda_tampered_receipt.jpg' : sampleType === 'mismatch' ? 'zenith_half_amount.png' : 'gtbank_instant_nip_145k.pdf',
      url: sampleType === 'forged' ? 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      sampleType,
    };
    setSelectedFile(fileSample);

    setTimeout(() => setUploadStep(2), 700); // Running OCR
    setTimeout(() => setUploadStep(3), 1400); // Interbank Reconcile

    setTimeout(async () => {
      try {
        const updated = await PayprufApi.uploadAndVerifyReceipt(tx.id, fileSample);
        setTx(updated);
        await refreshData();

        setIsUploading(false);
        setUploadStep(0);

        if (updated.status === 'CONFIRMED') {
          setActiveTab('confirmed');
          triggerConfetti();
          addToast('Payment Confirmed!', 'Transfer verified and reconciled successfully', 'success');
        } else if (updated.status === 'MISMATCH') {
          setActiveTab('details');
          addToast('Amount Mismatch Detected', updated.statusReason || 'Shortfall flagged', 'warning');
        } else {
          setActiveTab('details');
          addToast('Verification Failed', updated.statusReason || 'Receipt rejected', 'error');
        }
      } catch (e) {
        setIsUploading(false);
        addToast('Verification Error', e?.message || 'Failed to process receipt', 'error');
      }
    }, 2200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw size={32} className="animate-spin text-purple-500 mb-3" />
        <p className="text-sm font-semibold">Loading secure payment checkout...</p>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-md w-full space-y-4">
          <AlertTriangle size={36} className="text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Payment Session Not Found</h2>
          <p className="text-xs text-slate-400">
            The requested checkout token <code>{token}</code> does not exist or has expired.
          </p>
          <button
            onClick={() => {
              if (onBackToDashboard) onBackToDashboard();
              else setCurrentView('dashboard');
            }}
            className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Navbar */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between py-2 mb-4">
        <Brand size="sm" isLight />

        <button
          onClick={() => {
            if (onBackToDashboard) onBackToDashboard();
            else setCurrentView('dashboard');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-purple-300 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Merchant Hub</span>
        </button>
      </div>

      {/* Main Checkout Card */}
      <div className="max-w-xl mx-auto w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Top Header with Merchant name & Security badge */}
        <div className="p-6 bg-gradient-to-r from-purple-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400 flex items-center gap-1">
              <ShieldCheck size={12} /> Paypruf Verified Merchant
            </span>
            <h2 className="text-base font-extrabold text-white mt-0.5">Apex Luxe Retail Ltd</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Invoice #{tx.reference}</p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Payable</span>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(tx.amount, tx.currency)}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Bank Transfer Details
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Upload Proof / Receipt
          </button>
          {tx.status === 'CONFIRMED' && (
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 ${
                activeTab === 'confirmed'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Receipt
            </button>
          )}
        </div>

        {/* Dynamic Card Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: Transfer Details */}
          {activeTab === 'details' && (
            <div className="space-y-5 animate-fade-in">
              {/* Virtual Account Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-purple-950/40 border border-purple-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-200">
                      {tx.assignedVirtualAccount.bankName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    <Clock size={11} />
                    <span>Expires in {formatCountdown(timeLeft)}</span>
                  </div>
                </div>

                {/* Account Number Display */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                    Virtual Account Number (Instant NIP)
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
                      {tx.assignedVirtualAccount.accountNumber}
                    </span>
                    <button
                      onClick={handleCopyAcc}
                      className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                    >
                      {copiedAcc ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                      <span>{copiedAcc ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Beneficiary Name Display */}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Beneficiary Name:</span>
                  <span className="font-bold text-slate-200 truncate max-w-[200px]">
                    {tx.assignedVirtualAccount.accountName}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Amount to Transfer:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <button
                      onClick={handleCopyAmount}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Copy exact amount"
                    >
                      {copiedAmount ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step instructions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  How to complete payment:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Open your banking app (GTBank, Access, Zenith, Kuda, ALAT, etc.)</li>
                  <li>Transfer exactly <strong>{formatCurrency(tx.amount, tx.currency)}</strong> to the account above.</li>
                  <li>Once transferred, click <strong>"I Have Transferred - Verify Receipt"</strong> below.</li>
                </ol>
              </div>

              {/* Action Button to Next Step */}
              <button
                onClick={() => setActiveTab('upload')}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg hover:shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>I Have Sent The Money (Upload Receipt)</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* TAB 2: Upload Receipt & Live Verification Progress */}
          {activeTab === 'upload' && (
            <div className="space-y-5 animate-fade-in">
              {isUploading ? (
                /* Scanning Step-by-Step Screen */
                <div className="p-8 rounded-2xl bg-slate-950 border border-purple-900/40 text-center space-y-6">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-600/30 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-purple-900/60 border-2 border-purple-500 flex items-center justify-center">
                      <ScanLine size={28} className="text-purple-300 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      Analyzing Proof of Payment
                    </h3>
                    <p className="text-xs text-purple-300 font-mono">
                      Paypruf ML Neural Engine verifying bank transfer...
                    </p>
                  </div>

                  {/* Step Checklist */}
                  <div className="max-w-xs mx-auto text-left text-xs space-y-2.5 font-medium">
                    <div className={`flex items-center gap-2 ${uploadStep >= 1 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      <CheckCircle2 size={15} className={uploadStep >= 1 ? 'text-emerald-400' : 'text-slate-600'} />
                      <span>1. Encrypting & parsing receipt image</span>
                    </div>

                    <div className={`flex items-center gap-2 ${uploadStep >= 2 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      <CheckCircle2 size={15} className={uploadStep >= 2 ? 'text-emerald-400' : 'text-slate-600'} />
                      <span>2. Extracting amount, NIP session & sender</span>
                    </div>

                    <div className={`flex items-center gap-2 ${uploadStep >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                      <CheckCircle2 size={15} className={uploadStep >= 3 ? 'text-emerald-400' : 'text-slate-600'} />
                      <span>3. Reconciling with Wema core banking ledger</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload Options */
                <div className="space-y-4">
                  <div className="text-xs text-slate-300">
                    Upload your bank transfer receipt or screenshot for instant automated clearance:
                  </div>

                  {/* Drag and drop box */}
                  <div 
                    onClick={() => handleUploadReceipt('perfect')}
                    className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-950/60 hover:bg-slate-950 transition-all text-center cursor-pointer space-y-3 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-950 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Click or Drag & Drop Transfer Receipt</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, PDF up to 10MB</p>
                    </div>
                  </div>

                  {/* Fast Simulation Selector for instant testing */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles size={13} /> Demo Test Scenarios:
                      </span>
                      <span className="text-[10px] text-slate-500">Pick a sample receipt</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <button
                        onClick={() => handleUploadReceipt('perfect')}
                        className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-left transition-colors"
                      >
                        <div className="font-bold">1. Genuine Match</div>
                        <div className="text-[10px] text-emerald-400">100% amount (₦{tx.amount.toLocaleString()})</div>
                      </button>

                      <button
                        onClick={() => handleUploadReceipt('mismatch')}
                        className="p-2 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 hover:bg-amber-900 text-left transition-colors"
                      >
                        <div className="font-bold">2. Underpaid Receipt</div>
                        <div className="text-[10px] text-amber-400">50% shortfall mismatch</div>
                      </button>

                      <button
                        onClick={() => handleUploadReceipt('forged')}
                        className="p-2 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 text-left transition-colors"
                      >
                        <div className="font-bold">3. Forged Image</div>
                        <div className="text-[10px] text-rose-400">Tampered font alert</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Confirmed Success Receipt */}
          {activeTab === 'confirmed' && tx.status === 'CONFIRMED' && (
            <div className="space-y-5 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={32} className="stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Payment Verified & Settled!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your bank transfer has been verified by Wema Paypruf and confirmed with the merchant.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Payment Reference:</span>
                  <span className="font-bold text-white">{tx.reference}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(tx.amount, tx.currency)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Payer Name:</span>
                  <span className="font-bold text-white">{tx.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Settled To:</span>
                  <span className="font-bold text-white">Apex Luxe Retail Ltd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NIP Clearing Timestamp:</span>
                  <span className="text-slate-300 text-[11px]">{formatDate(tx.updatedAt)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => {
                    if (onBackToDashboard) onBackToDashboard();
                    else setCurrentView('dashboard');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Security Seal */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <Lock size={12} className="text-emerald-500" />
          <span>Secured by 256-bit Wema Bank ALAT Encryption & Paypruf AI Heuristics</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full text-center text-[11px] text-slate-500 py-3">
        © 2026 Paypruf Payment Verification Systems. All rights reserved.
      </div>
    </div>
  );
};
