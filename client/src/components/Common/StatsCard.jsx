import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xs shadow-blue-500/20',
      badge: 'bg-blue-50 text-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-500/20',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs shadow-amber-500/20',
      badge: 'bg-amber-50 text-amber-800',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xs shadow-purple-500/20',
      badge: 'bg-purple-50 text-purple-700',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xs shadow-rose-500/20',
      badge: 'bg-rose-50 text-rose-700',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs shadow-indigo-500/20',
      badge: 'bg-indigo-50 text-indigo-700',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="relative p-5 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05),0_8px_10px_-6px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
            {title}
          </p>
          <h4 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            {value}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium leading-tight">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${scheme.iconBg} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center text-xs">
          <span
            className={`inline-flex items-center space-x-1 font-bold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{trend.value}</span>
          </span>
          <span className="ml-1.5 text-slate-400 text-[11px]">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
