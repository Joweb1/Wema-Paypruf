import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PayprufApi, loadProfile, saveProfile } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(undefined);

export function AppProvider({ children }) {
  const { activeEnvironment } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [profile, setProfile] = useState(loadProfile());
  const [loading, setLoading] = useState(true);

  // Navigation & Modals state
  const [currentView, setCurrentView] = useState('dashboard');
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [isSandboxTesterOpen, setIsSandboxTesterOpen] = useState(false);
  const [inspectingReceiptTx, setInspectingReceiptTx] = useState(null);
  const [inspectingTimelineTx, setInspectingTimelineTx] = useState(null);
  const [activePublicToken, setActivePublicToken] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, description, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch all transactions & stats
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const txs = await PayprufApi.getTransactions(activeEnvironment);
      const sum = await PayprufApi.getSummary(activeEnvironment);
      setTransactions(txs);
      setSummary(sum);
    } catch (e) {
      console.error('Error refreshing data', e);
      addToast('Error', 'Failed to load transaction data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeEnvironment, addToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update profile
  const updateProfile = async (newProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
    addToast('Settings Saved', 'Merchant settings updated successfully', 'success');
  };

  // Status override handler
  const handleManualOverride = async (txId, newStatus, reason) => {
    try {
      const updated = await PayprufApi.manualOverrideStatus(txId, newStatus, reason);
      await refreshData();
      addToast(
        'Status Updated',
        `Transaction ${updated.reference} set to ${newStatus}`,
        'success'
      );
      if (inspectingReceiptTx?.id === txId) {
        setInspectingReceiptTx(updated);
      }
    } catch (e) {
      addToast('Override Failed', e?.message, 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        transactions,
        summary,
        profile,
        loading,
        currentView,
        setCurrentView,
        isCreatePaymentOpen,
        setIsCreatePaymentOpen,
        isSandboxTesterOpen,
        setIsSandboxTesterOpen,
        inspectingReceiptTx,
        setInspectingReceiptTx,
        inspectingTimelineTx,
        setInspectingTimelineTx,
        activePublicToken,
        setActivePublicToken,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        refreshData,
        updateProfile,
        handleManualOverride,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
