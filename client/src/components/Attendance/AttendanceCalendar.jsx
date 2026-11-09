import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceCalendar({ records = [], selectedMonth, selectedYear, onMonthChange }) {
  const [activeDateInfo, setActiveDateInfo] = useState(null);

  const month = selectedMonth || new Date().getMonth() + 1;
  const year = selectedYear || new Date().getFullYear();

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sun

  // Map records by date string YYYY-MM-DD
  const recordMap = {};
  records.forEach((r) => {
    recordMap[r.date] = r;
  });

  const handlePrevMonth = () => {
    let newM = month - 1;
    let newY = year;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const handleNextMonth = () => {
    let newM = month + 1;
    let newY = year;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const days = [];
  // Empty slots for padding before first day of month
  for (let i = 0; i < firstDayIndex; i++) {
    days.push({ day: null, dateStr: null });
  }
  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const rec = recordMap[dateStr];
    days.push({ day: d, dateStr, isWeekend, record: rec });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-800 text-base">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-medium text-xs text-slate-400 mb-2">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((item, index) => {
          if (!item.day) {
            return <div key={`empty-${index}`} className="h-16 rounded-xl bg-slate-50/50" />;
          }

          const { day, dateStr, isWeekend, record } = item;
          let cellBg = 'bg-slate-50 text-slate-700 hover:border-slate-300';
          let statusDot = null;
          let statusLabel = '';

          if (isWeekend) {
            cellBg = 'bg-slate-100/60 text-slate-400';
            statusLabel = 'Weekend';
          } else if (record) {
            if (record.status === 'Present') {
              cellBg = 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:border-emerald-400';
              statusDot = record.is_late ? 'bg-orange-500' : 'bg-emerald-500';
              statusLabel = record.is_late ? 'Late' : 'Present';
            } else if (record.status === 'Half Day') {
              cellBg = 'bg-amber-50/80 text-amber-800 border-amber-200 hover:border-amber-400';
              statusDot = 'bg-amber-500';
              statusLabel = 'Half Day';
            } else if (record.status === 'On Leave') {
              cellBg = 'bg-blue-50/80 text-blue-800 border-blue-200 hover:border-blue-400';
              statusDot = 'bg-blue-500';
              statusLabel = 'Leave';
            } else if (record.status === 'Absent') {
              cellBg = 'bg-rose-50/80 text-rose-800 border-rose-200 hover:border-rose-400';
              statusDot = 'bg-rose-500';
              statusLabel = 'Absent';
            }
          }

          return (
            <div
              key={dateStr}
              onClick={() => record && setActiveDateInfo(record)}
              className={`h-16 p-1.5 rounded-xl border border-transparent transition-all flex flex-col justify-between cursor-pointer ${cellBg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{day}</span>
                {statusDot && <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />}
              </div>
              <div className="text-[10px] font-medium truncate">
                {record?.working_hours ? `${record.working_hours}h` : statusLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Late</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Half Day</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>On Leave</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Absent</span>
        </div>
      </div>

      {/* Day Details Popup/Drawer */}
      {activeDateInfo && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm text-slate-900">{activeDateInfo.date}</p>
            <div className="mt-1 space-y-0.5">
              <p>Status: <strong className="capitalize">{activeDateInfo.status}</strong> {activeDateInfo.is_late ? '(Late)' : ''}</p>
              <p>Punch: {activeDateInfo.clock_in || 'N/A'} - {activeDateInfo.clock_out || 'N/A'} ({activeDateInfo.working_hours || 0} hrs)</p>
              {activeDateInfo.overtime_hours > 0 && <p className="text-emerald-600 font-medium">Overtime: {activeDateInfo.overtime_hours} hrs</p>}
              {activeDateInfo.notes && <p className="text-slate-500 italic">Notes: {activeDateInfo.notes}</p>}
            </div>
          </div>
          <button
            onClick={() => setActiveDateInfo(null)}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
