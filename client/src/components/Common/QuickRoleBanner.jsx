import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Crown, Shield, UserCheck, Briefcase, Building } from 'lucide-react';

export default function QuickRoleBanner() {
  const { user, role, quickLogin, companyName } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between border-b border-indigo-900/50 shadow-xs">
      <div className="flex items-center space-x-2 my-0.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider text-[10px]">
          Demo Quick Switcher
        </span>
        <span className="text-slate-300">
          User: <strong className="text-white capitalize">{user.name || user.email}</strong>
          <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
            {role.toUpperCase()}
          </span>
          {companyName && role !== 'owner' && (
            <span className="ml-1.5 text-slate-400 hidden md:inline">
              • Org: <strong className="text-slate-200">{companyName}</strong>
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 my-0.5">
        <span className="text-slate-400 mr-1 hidden sm:inline text-[11px]">Instant Switch:</span>

        {/* 1. Egotech Platform Owner */}
        <button
          onClick={() => quickLogin('owner')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 cursor-pointer text-xs ${
            role === 'owner'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
              : 'bg-amber-950/60 text-amber-200 hover:bg-amber-900/80 border border-amber-700/50'
          }`}
          title="Login as Egotech Platform Owner (SaaS Vendor)"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Egotech Owner</span>
        </button>

        {/* 2. Company Administrator */}
        <button
          onClick={() => quickLogin('admin')}
          className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 cursor-pointer text-xs ${
            role === 'admin'
              ? 'bg-indigo-600 text-white shadow-xs font-bold'
              : 'bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900/80 border border-indigo-700/50'
          }`}
          title="Login as Operations Administrator"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Company Admin</span>
        </button>

        {/* 3. HR Manager */}
        <button
          onClick={() => quickLogin('hr')}
          className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 cursor-pointer text-xs ${
            role === 'hr'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
          title="Login as HR Manager"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>HR Manager</span>
        </button>

        {/* 4. Employee */}
        <button
          onClick={() => quickLogin('employee')}
          className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 cursor-pointer text-xs ${
            role === 'employee'
              ? 'bg-emerald-600 text-white shadow-xs font-bold'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
          }`}
          title="Login as Employee (John Doe)"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Employee</span>
        </button>
      </div>
    </div>
  );
}
