import React, { useState, useEffect } from 'react';
import { Menu, Bell, Shield, Briefcase, UserCheck, Clock, CheckCircle2, AlertTriangle, LogOut, Search, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../Common/Badge';

export default function Navbar({ onToggleSidebar, onOpenPalette }) {
  const { user, role, isOwner, companyName, companyLogo, primaryColor, poweredByText, logout } = useAuth();
  const [istTime, setIstTime] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // NTP IST Clock (CERT-In Compliance)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-2xs">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <span>Welcome back, {user?.first_name || user?.name || 'User'}</span>
            {isOwner && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-300">
                Platform Owner
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">
            {user?.designation ? `${user.designation} • ${user.department_name || ''}` : (companyName || 'Egotech Technologies')}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Command Palette Trigger Pill */}
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/90 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs group"
          title="Open Command Palette (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="font-medium">Quick Search / Jump...</span>
          <kbd className="text-[10px] font-mono font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        {/* NTP Indian Standard Time Clock (CERT-In Mandate) */}
        <div className="hidden xl:flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">IST NTP:</span>
          <span className="font-mono text-slate-800 font-bold">{istTime || '12:00:00 PM'}</span>
        </div>

        {/* Co-Branding Badge in Navbar */}
        {!isOwner && (
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-slate-50/80 border border-slate-200/90 rounded-xl shadow-2xs">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-4 max-w-[80px] object-contain" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor || '#0078d4' }} />
            )}
            <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{companyName}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-300 tracking-tight">
              {poweredByText || 'Powered by Egotech'}
            </span>
          </div>
        )}

        {/* Role Pill */}
        <div className="hidden sm:flex items-center">
          <Badge status={role} label={role.toUpperCase()} />
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition relative"
            title="System & Statutory Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                <span>Compliance & System Feed</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Labour Code 50% Wage Ratio</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Payroll wages compliant under Code on Wages 2025.</p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start space-x-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-indigo-900">CERT-In 6h Incident Ready</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">180-day ICT logging enabled with NTP clock sync.</p>
                  </div>
                </div>
              </div>
              <a
                href="/compliance"
                onClick={() => setShowNotifications(false)}
                className="block text-center py-1.5 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg transition"
              >
                Open Compliance & Legal Hub →
              </a>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
              isOwner
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
                : 'bg-linear-to-tr from-indigo-600 to-purple-600 text-white'
            }`}>
              {user?.first_name ? user.first_name[0] : user?.name ? user.name[0] : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{user?.email}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-800">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                  Org: {companyName || 'Egotech Technologies'}
                </p>
              </div>
              <div className="py-1">
                <a
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings & Preferences</span>
                </a>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
