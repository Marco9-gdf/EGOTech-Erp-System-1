import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  owner: { email: 'khiladiharsh786@gmail.com', password: '826999', label: '👑 Platform Owner (Harsh Shrivastava)', role: 'owner' },
  admin: { email: 'admin@egotech.com', password: '826999', label: 'Egotech Admin (admin@egotech.com)', role: 'admin' },
  hr: { email: 'hr@company.com', password: '826999', label: 'HR Manager (hr@company.com)', role: 'hr' },
  employee: { email: 'john.doe@company.com', password: '826999', label: 'Staff Member (John Doe)', role: 'employee' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('payroll_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse saved user from localStorage:', e);
      try { localStorage.removeItem('payroll_user'); } catch (_) {}
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('payroll_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then((res) => {
          setUser(res.user);
          localStorage.setItem('payroll_user', JSON.stringify(res.user));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('payroll_token', res.token);
    localStorage.setItem('payroll_user', JSON.stringify(res.user));
    return res.user;
  };

  const quickLogin = async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('payroll_token');
    localStorage.removeItem('payroll_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      localStorage.setItem('payroll_user', JSON.stringify(res.user));
    } catch (e) {
      console.error('Error refreshing user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role,
        isOwner: user?.role === 'owner',
        isAdmin: ['owner', 'admin'].includes(user?.role),
        isHr: ['owner', 'admin', 'hr'].includes(user?.role),
        isEmployee: user?.role === 'employee',
        isAuthenticated: Boolean(user && token),
        companyId: user?.company_id || 1,
        companyName: user?.company_name || 'Egotech Technologies',
        companyLogo: user?.company_logo_url || '',
        currencySymbol: (user?.currency_symbol && user.currency_symbol !== '?') ? user.currency_symbol : (user?.currency_code === 'USD' ? '$' : '₹'),
        currencyCode: user?.currency_code || 'INR',
        primaryColor: user?.primary_color || '#0078d4',
        poweredByText: user?.powered_by_text || 'Powered by Egotech',
        poweredByLogo: user?.powered_by_logo || '',
        vendorLogoUrl: user?.vendor_logo_url || '',
        customTagline: user?.custom_tagline || '',
        loading,
        login,
        quickLogin,
        logout,
        refreshUser,
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
