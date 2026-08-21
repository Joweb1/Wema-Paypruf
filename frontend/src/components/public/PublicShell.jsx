import React from 'react';
import { PublicPaymentPortal } from './PublicPaymentPortal';
import { ToastContainer } from '../common/Toast';
import { useApp } from '../../context/AppContext';

export const PublicShell = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <PublicPaymentPortal onBackToDashboard={() => setCurrentView('dashboard')} />
      <ToastContainer />
    </div>
  );
};
