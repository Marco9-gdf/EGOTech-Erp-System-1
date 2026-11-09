import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Shield,
  Crown,
  KeyRound,
  X,
  Receipt,
  Globe,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const {
    user,
    role,
    isOwner,
    isAdmin,
    isHr,
    companyName,
    companyLogo,
    primaryColor,
    poweredByText,
    logout,
  } = useAuth();

  // Navigation items grouped by sections based on role
  let navSections = [];

  if (isOwner) {
    navSections = [
      {
        title: 'Platform Control',
        items: [
          { name: 'Vendor Command Center', to: '/', icon: LayoutDashboard },
          { name: 'Client Organizations', to: '/clients', icon: Building2, badge: 'Tenants' },
          { name: 'All User Accounts', to: '/accounts', icon: KeyRound },
          { name: 'Compliance & Legal', to: '/compliance', icon: Shield, badge: '2026' },
          { name: 'Public SaaS Storefront', to: '/landing', icon: Globe },
        ],
      },
      {
        title: 'Egotech (My Company)',
        items: [
          { name: 'Employees & Staff', to: '/employees', icon: Users },
          { name: 'Payroll & Compensation', to: '/payroll', icon: CreditCard },
          { name: 'Attendance & Biometrics', to: '/attendance', icon: CalendarCheck },
          { name: 'Leave Management', to: '/leaves', icon: CalendarDays },
          { name: 'Analytics & Reports', to: '/reports', icon: BarChart3 },
        ],
      },
      {
        title: 'Platform Operations',
        items: [
          { name: 'Expenses Hub', to: '/expenses', icon: Receipt },
          { name: 'System Settings', to: '/settings', icon: Settings },
        ],
      },
    ];
  } else {
    navSections = [
      {
        title: 'Main',
        items: [
          { name: isHr ? 'Company Dashboard' : 'My Workspace', to: '/', icon: LayoutDashboard },
          ...(isAdmin ? [{ name: 'User Logins', to: '/accounts', icon: KeyRound }] : []),
        ],
      },
      {
        title: 'Workforce',
        items: [
          ...(isHr ? [{ name: 'Employees', to: '/employees', icon: Users }] : []),
          { name: 'Attendance', to: '/attendance', icon: CalendarCheck },
          { name: 'Leaves', to: '/leaves', icon: CalendarDays },
          { name: 'Expenses', to: '/expenses', icon: Receipt },
        ],
      },
      {
        title: 'Finance & Statutory',
        items: [
          ...(isHr ? [{ name: 'Payroll Engine', to: '/payroll', icon: CreditCard, badge: 'Maker-Checker' }] : []),
          { name: 'Payslips', to: '/payslips', icon: FileText },
          ...(isHr ? [{ name: 'Reports & Audit', to: '/reports', icon: BarChart3 }] : []),
          { name: isHr ? 'Compliance & Legal' : 'Compliance & Tax', to: '/compliance', icon: Shield, badge: 'Labour Codes' },
        ],
      },
      {
        title: 'Configuration',
        items: [
          { name: 'Settings', to: '/settings', icon: Settings },
        ],
      },
    ];
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Brand */}
        <div>
          <div className="flex items-center justify-between h-20 px-5 border-b border-slate-800/80">
            <div className="flex items-center space-x-3 overflow-hidden">
              {isOwner ? (
                <div className="p-2.5 rounded-xl shadow-md shrink-0 bg-amber-500 text-slate-950 shadow-amber-500/30">
                  <Crown className="w-5 h-5" />
                </div>
              ) : companyLogo ? (
                <div className="p-1 rounded-xl bg-white shadow-md shrink-0 border border-slate-700 max-w-[42px] max-h-[42px] flex items-center justify-center">
                  <img src={companyLogo} alt={companyName} className="w-8 h-8 object-contain" />
                </div>
              ) : (
                <div
                  className="p-2.5 rounded-xl shadow-md shrink-0 text-white"
                  style={{ backgroundColor: primaryColor || '#0078d4' }}
                >
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm tracking-tight text-white leading-tight truncate">
                  {isOwner ? 'Egotech SaaS' : (companyName || 'Egotech')}
                </h1>
                <p className="text-[10px] text-amber-400/90 font-medium tracking-tight truncate mt-0.5">
                  {isOwner ? 'Platform Provider' : (poweredByText || 'Powered by Egotech')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links Grouped by Section */}
          <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-190px)]">
            {navSections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sec.title}
                </p>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? isOwner
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                              : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                          isOwner
                            ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                            : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom: Co-Branding & User Card */}
        <div className="p-4 border-t border-slate-800/80 space-y-2.5">
          {!isOwner && (
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750/70">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-200 truncate">{companyName}</span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor || '#0078d4' }} />
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="truncate">{poweredByText || 'Powered by Egotech'}</span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border ${
                isOwner
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
              }`}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.name || user?.email}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
