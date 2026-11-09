import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Shield,
  Receipt,
  Settings,
  Building2,
  KeyRound,
  Crown,
  LogIn,
  Plus,
  Play,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isOwner, isAdmin, isHr, quickLogin } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open through custom event or prop
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build searchable commands list
  const pages = [
    { id: 'p-dash', title: isHr ? 'Company Dashboard' : 'My Workspace', category: 'Navigation', icon: LayoutDashboard, path: '/' },
    ...(isOwner ? [{ id: 'p-clients', title: 'Client Organizations (Tenants)', category: 'Navigation', icon: Building2, path: '/clients' }] : []),
    ...(isAdmin ? [{ id: 'p-accounts', title: 'User Logins & Accounts', category: 'Navigation', icon: KeyRound, path: '/accounts' }] : []),
    ...(isHr ? [{ id: 'p-emp', title: 'Employee Directory', category: 'Navigation', icon: Users, path: '/employees' }] : []),
    { id: 'p-att', title: 'Attendance Terminal & Logs', category: 'Navigation', icon: CalendarCheck, path: '/attendance' },
    { id: 'p-leave', title: 'Leave Applications & Quotas', category: 'Navigation', icon: CalendarDays, path: '/leaves' },
    { id: 'p-exp', title: 'Expenses & Reimbursements Hub', category: 'Navigation', icon: Receipt, path: '/expenses' },
    ...(isHr ? [{ id: 'p-pay', title: 'Payroll Engine (Maker-Checker)', category: 'Navigation', icon: CreditCard, path: '/payroll' }] : []),
    { id: 'p-slips', title: 'Payslips & Earnings Records', category: 'Navigation', icon: FileText, path: '/payslips' },
    { id: 'p-comp', title: 'Statutory Compliance & Legal Governance', category: 'Navigation', icon: Shield, path: '/compliance' },
    { id: 'p-set', title: 'System & Organization Settings', category: 'Navigation', icon: Settings, path: '/settings' },
  ];

  const quickRoles = [
    { id: 'r-owner', title: 'Switch to Egotech Platform Owner', subtitle: 'SaaS Vendor Command Center', category: 'Role Switcher', icon: Crown, roleKey: 'owner' },
    { id: 'r-admin', title: 'Switch to Company Admin', subtitle: 'Organization & Operations Admin', category: 'Role Switcher', icon: Building2, roleKey: 'admin' },
    { id: 'r-hr', title: 'Switch to HR Specialist', subtitle: 'Attendance, Leaves & Payroll runs', category: 'Role Switcher', icon: Users, roleKey: 'hr' },
    { id: 'r-emp', title: 'Switch to Employee (John Doe)', subtitle: 'Self-service portal', category: 'Role Switcher', icon: LogIn, roleKey: 'employee' },
  ];

  const quickActions = [
    { id: 'a-punch', title: 'Punch In / Clock In', category: 'Quick Action', icon: CalendarCheck, path: '/attendance' },
    { id: 'a-leave', title: 'Apply for Time Off / Leave', category: 'Quick Action', icon: CalendarDays, path: '/leaves' },
    { id: 'a-exp', title: 'Submit Expense Reimbursement Claim', category: 'Quick Action', icon: Plus, path: '/expenses' },
    ...(isHr ? [{ id: 'a-pay', title: 'Run Monthly Payroll Simulation', category: 'Quick Action', icon: Play, path: '/payroll' }] : []),
    { id: 'a-tax', title: 'Form 12BB TDS Tax Calculator', category: 'Quick Action', icon: Shield, path: '/compliance' },
  ];

  const allItems = [...pages, ...quickActions, ...quickRoles];

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  });

  const handleSelect = async (item) => {
    onClose();
    if (item.path) {
      navigate(item.path);
    } else if (item.roleKey) {
      try {
        await quickLogin(item.roleKey);
        toast.success(`Switched role to ${item.title}`);
        navigate('/');
      } catch (err) {
        toast.error(err.message || 'Quick login failed');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200/90 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, switch roles, or run quick actions... (or press Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md ml-2 border border-slate-300/60">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 max-h-[60vh]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No matching commands found</p>
              <p className="mt-1">Try typing "Payroll", "Compliance", "Owner", or "Leave"</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : item.category === 'Role Switcher'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center space-x-3">
            <span><strong className="font-mono bg-slate-200/60 px-1 rounded">↑↓</strong> Navigate</span>
            <span><strong className="font-mono bg-slate-200/60 px-1 rounded">↵</strong> Select</span>
            <span><strong className="font-mono bg-slate-200/60 px-1 rounded">ESC</strong> Close</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold">Egotech Command Palette</span>
        </div>
      </div>
    </div>
  );
}
