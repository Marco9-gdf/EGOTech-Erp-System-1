import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Crown,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);

  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  // Test backend connectivity
  useEffect(() => {
    api.checkHealth()
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (roleKey) => {
    try {
      setLoading(true);
      setError('');
      await quickLogin(roleKey);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center px-4">
        <div className="inline-flex p-3 bg-linear-to-tr from-amber-500 to-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 mb-3">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Egotech SaaS Platform
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Cloud Payroll & Attendance Management System
        </p>

        {/* Server Status Pill */}
        <div className="mt-2 flex items-center justify-center">
          {serverOnline === true ? (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Backend API Online</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Cloud Preview Active</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 sm:px-9 shadow-2xl rounded-3xl border border-slate-100">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@egotech.com or khiladiharsh786@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                  Password: 826999
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="826999"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 sm:py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Marketing Storefront & Trial Link */}
          <div className="mt-4 p-3 rounded-xl bg-linear-to-r from-indigo-50/80 via-white to-amber-50/80 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">New to Egotech SaaS?</p>
              <p className="text-[10px] text-slate-500">Explore feature tour or start a 14-day free trial</p>
            </div>
            <button
              onClick={() => navigate('/landing')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
            >
              Visit Storefront
            </button>
          </div>

          {/* Quick Demo Access Section */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instant Quick Access
              </p>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Master Pass: 826999
              </span>
            </div>

            <div className="space-y-1.5">
              {/* 1. Egotech Platform Owner */}
              <button
                type="button"
                onClick={() => handleQuick('owner')}
                disabled={loading}
                className="w-full p-2.5 bg-amber-50 hover:bg-amber-100/90 text-amber-950 border border-amber-300 rounded-xl text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-amber-950">👑 Harsh Shrivastava (Platform Owner)</p>
                    <p className="text-[10px] text-amber-800 font-mono">khiladiharsh786@gmail.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-extrabold uppercase">
                  LOGIN OWNER
                </span>
              </button>

              {/* 2. Egotech Operations Administrator */}
              <button
                type="button"
                onClick={() => handleQuick('admin')}
                disabled={loading}
                className="w-full p-2.5 bg-indigo-50 hover:bg-indigo-100/90 text-indigo-950 border border-indigo-200 rounded-xl text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-indigo-950">Egotech Operations Admin</p>
                    <p className="text-[10px] text-indigo-700 font-mono">admin@egotech.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded font-bold uppercase">
                  LOGIN ADMIN
                </span>
              </button>

              {/* 3. HR Manager */}
              <button
                type="button"
                onClick={() => handleQuick('hr')}
                disabled={loading}
                className="w-full p-2.5 bg-blue-50 hover:bg-blue-100/90 text-blue-950 border border-blue-200 rounded-xl text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white font-bold">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-blue-950">HR Manager</p>
                    <p className="text-[10px] text-blue-700 font-mono">hr@company.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold uppercase">
                  LOGIN HR
                </span>
              </button>

              {/* 4. Employee */}
              <button
                type="button"
                onClick={() => handleQuick('employee')}
                disabled={loading}
                className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100/90 text-emerald-950 border border-emerald-200 rounded-xl text-xs transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-emerald-950">Employee Portal (John Doe)</p>
                    <p className="text-[10px] text-emerald-700 font-mono">john.doe@company.com</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  LOGIN STAFF
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
