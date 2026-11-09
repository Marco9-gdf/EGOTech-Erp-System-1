import React from 'react';

const STATUS_STYLES = {
  // Attendance
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10',
  'Half Day': 'bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/10',
  Absent: 'bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/10',
  'On Leave': 'bg-sky-50 text-sky-700 border-sky-200/80 ring-1 ring-sky-500/10',
  Late: 'bg-orange-50 text-orange-700 border-orange-200/80 ring-1 ring-orange-500/10',

  // Leaves & Batches & Approvals
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10 font-semibold',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/10 font-semibold',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/10 font-semibold',
  Draft: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/10',
  'Under Review': 'bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-1 ring-indigo-500/20 font-semibold',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10 font-semibold',
  Generated: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-1 ring-indigo-500/10',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10',
  Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  Compliant: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold',
  'Non-Compliant': 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',

  // Roles
  owner: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-500/20 font-bold',
  admin: 'bg-purple-50 text-purple-700 border-purple-200/80 ring-1 ring-purple-500/10 font-semibold',
  hr: 'bg-blue-50 text-blue-700 border-blue-200/80 ring-1 ring-blue-500/10 font-semibold',
  employee: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/10 font-medium',

  // Tenant Plans & Statuses
  Enterprise: 'bg-purple-50 text-purple-700 border-purple-200/80 font-semibold',
  Professional: 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold',
  Starter: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold',
  Trial: 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold',
  Suspended: 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold',
};

const PULSE_STATUSES = ['Pending', 'Under Review', 'Active', 'Present'];

export default function Badge({ status, label, className = '' }) {
  const text = label || status || 'Unknown';
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const shouldPulse = PULSE_STATUSES.includes(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border tracking-tight transition-colors ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full bg-current ${shouldPulse ? 'animate-pulse' : 'opacity-70'}`} />
      {text}
    </span>
  );
}
