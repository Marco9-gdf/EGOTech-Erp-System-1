import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Users,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Reports() {
  const { currencySymbol = '$' } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');

  // Attendance Report State
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear] = useState(new Date().getFullYear());
  const [attDept, setAttDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const [attReport, setAttReport] = useState([]);
  const [attLoading, setAttLoading] = useState(true);

  // Payroll Report State
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payBatches, setPayBatches] = useState([]);
  const [payLoading, setPayLoading] = useState(true);

  useEffect(() => {
    api.getDepartments().then((res) => setDepartments(res.departments || [])).catch(() => {});
  }, []);

  const fetchAttendanceReport = async () => {
    try {
      setAttLoading(true);
      const res = await api.getAttendanceReport(attMonth, attYear, attDept);
      setAttReport(res.report || []);
    } catch (err) {
      console.error('Failed to load attendance report:', err);
    } finally {
      setAttLoading(false);
    }
  };

  const fetchPayrollReport = async () => {
    try {
      setPayLoading(true);
      const res = await api.getPayrollReport(payYear);
      setPayBatches(res.batches || []);
    } catch (err) {
      console.error('Failed to load payroll report:', err);
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceReport();
    } else {
      fetchPayrollReport();
    }
  }, [activeTab, attMonth, attYear, attDept, payYear]);

  // Chart data for payroll trends
  const chartData = payBatches.map((b) => ({
    name: MONTH_NAMES[b.month - 1].slice(0, 3),
    Net: b.total_net,
    Gross: b.total_gross,
    Deductions: b.total_deductions,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">Comprehensive workforce attendance metrics and payroll expenditures</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center p-1 bg-slate-200/60 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Audit
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payroll Expenditure
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ATTENDANCE REPORT TAB                                              */}
      {/* =================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Filters & Export Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={attMonth}
                onChange={(e) => setAttMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={attYear}
                onChange={(e) => setAttYear(Number(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />

              <select
                value={attDept}
                onChange={(e) => setAttDept(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <a
              href={api.getAttendanceCsvUrl(attMonth, attYear, attDept)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </a>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Half Day</th>
                    <th className="py-3 px-4 text-center">Late Marks</th>
                    <th className="py-3 px-4 text-center">Leaves</th>
                    <th className="py-3 px-4 text-center">Total Hours</th>
                    <th className="py-3 px-4 text-center">OT Hours</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attLoading ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        Compiling attendance audit...
                      </td>
                    </tr>
                  ) : attReport.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        No attendance records for the selected period.
                      </td>
                    </tr>
                  ) : (
                    attReport.map((r) => (
                      <tr key={r.employee_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <p>{r.name}</p>
                          <p className="text-[10px] text-slate-400">{r.employee_code}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-700">{r.department}</p>
                          <p className="text-[10px] text-slate-400">{r.designation}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {r.present_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-amber-600">
                          {r.half_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-orange-600">
                          {r.late_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-blue-600">
                          {r.leave_days}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                          {r.total_hours}h
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-emerald-600">
                          {r.total_ot_hours}h
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                            {r.attendance_rate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PAYROLL EXPENDITURE TAB                                            */}
      {/* =================================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium">Fiscal Year:</span>
              <input
                type="number"
                value={payYear}
                onChange={(e) => setPayYear(Number(e.target.value))}
                className="w-28 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <a
              href={api.getPayrollCsvUrl(payYear)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Payroll CSV</span>
            </a>
          </div>

          {/* Bar Chart of Payroll Trends */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">
              Monthly Salary Expenditure Trend ({payYear})
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`${currencySymbol}${Number(val).toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Net" fill="#059669" name="Net Disbursed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Deductions" fill="#ef4444" name="Deductions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Pay Period</th>
                    <th className="py-3 px-4">Batch Label</th>
                    <th className="py-3 px-4 text-center">Headcount</th>
                    <th className="py-3 px-4">Total Gross</th>
                    <th className="py-3 px-4">Total Deductions</th>
                    <th className="py-3 px-4">Net Disbursed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Disbursement Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payLoading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        Loading payroll report...
                      </td>
                    </tr>
                  ) : payBatches.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400">
                        No payroll batches found for {payYear}.
                      </td>
                    </tr>
                  ) : (
                    payBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {MONTH_NAMES[b.month - 1]} {b.year}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{b.batch_name}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                          {b.staff_count} Staff
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {currencySymbol}{Number(b.total_gross).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-rose-600">
                          -{currencySymbol}{Number(b.total_deductions).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          {currencySymbol}{Number(b.total_net).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status={b.status} />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {b.payment_date || 'Pending'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
