import React from 'react';
import { 
  Plus, 
  FlaskConical, 
  ExternalLink,
  ShieldCheck, 
  Settings, 
  History, 
  CreditCard,
  ScanLine
} from 'lucide-react';
import { Brand } from './Brand';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const { 
    currentView, 
    setCurrentView, 
    setIsCreatePaymentOpen, 
    setIsSandboxTesterOpen,
    transactions,
    setActivePublicToken
  } = useApp();

  const { activeEnvironment, switchEnvironment, currentUser } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: ShieldCheck },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'verification_hub', label: 'ML Scan Hub', icon: ScanLine },
    { id: 'payment_links', label: 'Payment Links', icon: Plus },
    { id: 'timeline_audit', label: 'Audit Timeline', icon: History },
    { id: 'settings', label: 'Settings & API', icon: Settings },
  ];

  const handleOpenDemoCheckout = () => {
    const firstTx = transactions[0];
    if (firstTx) {
      setActivePublicToken(firstTx.token);
      setCurrentView('public_checkout');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Left Section */}
          <div className="flex items-center gap-8">
            <div 
              className="cursor-pointer" 
              onClick={() => setCurrentView('dashboard')}
            >
              <Brand size="md" />
            </div>

            {/* Environment Toggle Pill */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => switchEnvironment('live')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeEnvironment === 'live'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Live Production
              </button>
              <button
                onClick={() => switchEnvironment('sandbox')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeEnvironment === 'sandbox'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Sandbox
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Sandbox Simulator Modal Trigger */}
            <button
              onClick={() => setIsSandboxTesterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors"
              title="Test genuine, mismatch & forged receipts simulation"
            >
              <FlaskConical size={16} className="text-purple-600" />
              <span className="hidden sm:inline">Simulator Lab</span>
            </button>

            {/* Open Sample Public Checkout Portal */}
            <button
              onClick={handleOpenDemoCheckout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold transition-colors"
              title="View Customer Payment Checkout Page"
            >
              <ExternalLink size={15} />
              <span className="hidden md:inline">Customer Portal</span>
            </button>

            {/* Create New Payment Button */}
            <button
              onClick={() => setIsCreatePaymentOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Create Payment</span>
            </button>
          </div>
        </div>

        {/* Mobile Submenu Navigation Bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2.5 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
