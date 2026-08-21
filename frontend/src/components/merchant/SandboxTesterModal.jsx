import React, { useState } from 'react';
import { 
  X, 
  FlaskConical, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  RefreshCcw, 
  CreditCard,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PayprufApi } from '../../services/api';

export const SandboxTesterModal = () => {
  const { 
    isSandboxTesterOpen, 
    setIsSandboxTesterOpen, 
    refreshData, 
    addToast
  } = useApp();

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isSandboxTesterOpen) return null;

  // 1. Simulate Perfect 100% Match
  const handleSimulatePerfect = async () => {
    try {
      setIsProcessing(true);
      const newTx = await PayprufApi.createPaymentLink({
        customerName: 'Adebayo Adeleke (Verified)',
        customerEmail: 'adebayo.a@lagostech.ng',
        customerPhone: '+234 803 123 4567',
        amount: 85000,
        currency: 'NGN',
        description: 'Demo Order #9910 - Enterprise Cloud Hosting',
      });

      await PayprufApi.uploadAndVerifyReceipt(newTx.id, {
        name: 'gtbank_clean_85k.pdf',
        url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        sampleType: 'perfect',
      });

      await refreshData();
      addToast('Simulation Complete', 'Simulated 100% genuine bank payment & receipt (98% ML Score)', 'success');
      setIsSandboxTesterOpen(false);
    } catch (e) {
      addToast('Simulation Error', e?.message || 'Error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Simulate Mismatch (Underpayment)
  const handleSimulateMismatch = async () => {
    try {
      setIsProcessing(true);
      const newTx = await PayprufApi.createPaymentLink({
        customerName: 'Kunle Johnson (Partial Transfer)',
        customerEmail: 'kunle.j@investments.co',
        amount: 300000,
        currency: 'NGN',
        description: 'Invoice #4021 - Consulting Retainer',
      });

      await PayprufApi.uploadAndVerifyReceipt(newTx.id, {
        name: 'zenith_partial_150k.png',
        url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
        sampleType: 'mismatch',
      });

      await refreshData();
      addToast('Mismatch Simulated', 'Triggered 50% underpayment mismatch alert (Score 48%)', 'warning');
      setIsSandboxTesterOpen(false);
    } catch (e) {
      addToast('Simulation Error', e?.message || 'Error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Simulate Forged / Critical Tampering
  const handleSimulateFraud = async () => {
    try {
      setIsProcessing(true);
      const newTx = await PayprufApi.createPaymentLink({
        customerName: 'Suspicious Bad Actor',
        customerEmail: 'darknet_buyer@proton.me',
        amount: 650000,
        currency: 'NGN',
        description: 'iPhone 16 Pro Max Checkout',
      });

      await PayprufApi.uploadAndVerifyReceipt(newTx.id, {
        name: 'photoshop_kuda_forged.jpg',
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
        sampleType: 'forged',
      });

      await refreshData();
      addToast('Critical Tampering Detected', 'Receipt quarantined: EXIF font tampering detected (Score 15%)', 'error');
      setIsSandboxTesterOpen(false);
    } catch (e) {
      addToast('Simulation Error', e?.message || 'Error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Reset Data
  const handleReset = async () => {
    if (window.confirm('Reset all transactions and configurations to factory demo defaults?')) {
      setIsProcessing(true);
      await PayprufApi.resetDemoData();
      await refreshData();
      setIsProcessing(false);
      setIsSandboxTesterOpen(false);
      addToast('Reset Successful', 'Data restored to factory demo state', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FlaskConical size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sandbox & Simulator Lab
              </h3>
              <p className="text-xs text-slate-500">
                Test how Paypruf handles genuine, mismatched, and forged receipts
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSandboxTesterOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Simulation Triggers */}
        <div className="space-y-3">
          {/* Option 1: Genuine */}
          <button
            onClick={handleSimulatePerfect}
            disabled={isProcessing}
            className="w-full text-left p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-start gap-3 group"
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950">Simulate 100% Genuine Payment</h4>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">98% Trust</span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Generates a clean GTBank receipt, matches NIP session ID, auto-settles.
              </p>
            </div>
          </button>

          {/* Option 2: Mismatch */}
          <button
            onClick={handleSimulateMismatch}
            disabled={isProcessing}
            className="w-full text-left p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-start gap-3 group"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-950">Simulate Underpayment (MISMATCH)</h4>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">48% Trust</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Customer transfers ₦150,000 instead of ₦300,000 invoice. Flags compliance review.
              </p>
            </div>
          </button>

          {/* Option 3: Forgery */}
          <button
            onClick={handleSimulateFraud}
            disabled={isProcessing}
            className="w-full text-left p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-start gap-3 group"
          >
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 group-hover:scale-105 transition-transform">
              <AlertOctagon size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-950">Simulate Fake / Forged Receipt (FRAUD)</h4>
                <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">15% Trust</span>
              </div>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Altered fonts, no clearing check digit. Quarantined as NOT_RECEIVED.
              </p>
            </div>
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors"
          >
            <RefreshCcw size={13} />
            <span>Reset Demo Records</span>
          </button>

          <button
            onClick={() => setIsSandboxTesterOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
