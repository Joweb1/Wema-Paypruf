import React from 'react';
import { Navbar } from '../common/Navbar';
import { DashboardOverview } from './DashboardOverview';
import { TransactionsList } from './TransactionsList';
import { VerificationHub } from './VerificationHub';
import { PaymentLinksManager } from './PaymentLinksManager';
import { TimelineAuditView, TimelineModal } from './TimelineAuditView';
import { MerchantSettings } from './MerchantSettings';
import { CreatePaymentModal } from './CreatePaymentModal';
import { SandboxTesterModal } from './SandboxTesterModal';
import { ReceiptVerificationModal } from './ReceiptVerificationModal';
import { ToastContainer } from '../common/Toast';
import { useApp } from '../../context/AppContext';

export const MerchantShell = () => {
  const { currentView } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {currentView === 'dashboard' && <DashboardOverview />}
          {currentView === 'transactions' && <TransactionsList />}
          {currentView === 'verification_hub' && <VerificationHub />}
          {currentView === 'payment_links' && <PaymentLinksManager />}
          {currentView === 'timeline_audit' && <TimelineAuditView />}
          {currentView === 'settings' && <MerchantSettings />}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/wemalogo.jpg" alt="Wema Paypruf" className="h-5 w-auto object-contain rounded" />
            <p>© 2026 Paypruf Payment Verification Systems. Secured by Wema Bank NIP APIs.</p>
          </div>
          <div className="flex items-center gap-4">
            <span>Neural OCR Engine: v3.8</span>
            <span>Zero-Knowledge Encryption</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <CreatePaymentModal />
      <SandboxTesterModal />
      <ReceiptVerificationModal />
      <TimelineModal />
      <ToastContainer />
    </div>
  );
};
