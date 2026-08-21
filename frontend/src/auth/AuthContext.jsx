import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getSession();
      setUser(res?.user || null);
      return res?.user || null;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refreshUser().finally(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async () => {
    return login({ identifier: "0123456789", password: "demopassword123" });
  };

  const register = async (payload) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (payload) => {
    setIsLoading(true);
    try {
      const res = await api.completeOnboarding(payload);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const merchantOnboardingCompleted = Boolean(
    user?.merchantOnboardingCompleted || user?.wemaAccountNumber
  );

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    merchantOnboardingCompleted,
    login,
    loginAsDemo,
    register,
    completeOnboarding,
    updateUser,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
