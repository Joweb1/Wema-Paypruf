import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState({
    id: 'usr_01HX9A873BCP4K',
    name: 'Korede Adeleke',
    email: 'korede@apexstore.ng',
    role: 'ADMIN',
    merchantId: 'mch_01HX9A873BCP4K',
  });

  const [activeEnvironment, setActiveEnvironment] = useState('live');

  const switchEnvironment = (env) => {
    setActiveEnvironment(env);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeEnvironment,
        switchEnvironment,
        isAuthenticated: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
