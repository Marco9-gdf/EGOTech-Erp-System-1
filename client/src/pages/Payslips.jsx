import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Send,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Payslips() {
  const { isHr, currencySymbol = '$' } = useAuth();
  const toast = useToast();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [emailingId, setEmailingId] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);

  const handleEmailPayslip = async (id) => {
    try {
      setEmailingId(id);
      setEmailMsg(null);
      await api.emailSinglePayslip(id);
      toast.success('Official PDF payslip emailed to your inbox successfully!', 'Email Sent');
    } catch (err) {
      toast.error(err.message || 'Failed to email payslip.');
    } finally {
      setEmailingId(null);
    }
  };

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await api.getPayslips();
      setPayslips(res.payslips || []);
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
    api.getCompanySettings().then((res) => setCompanySettings(res.company)).catch(() => {});
  }, []);

  const handleOpenView = async (id) => {
    try {
      const res = await api.getPayslipById(id);
      setSelectedPayslip(res.payslip);
      if (res.company) setCompanySettings(res.company);
      setViewModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to open payslip details.');
    }
  };

  return (
    <div className="space-y-6">
      {emailMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{emailMsg}</span>
          </div>
          <button onClick={() => setEmailMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isHr ? 'Workforce Payslip Archive' : 'My Salary Payslips'}
          </h2>
          <p className="text-xs text-slate-500">
            Access monthly compensation statements, tax deductions, and official PDF downloads
          </p>
        </div>
      </div>

      {/* Grid of Payslips Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">
            Loading payslips...
          </div>
        ) : payslips.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
            No payslips issued yet.
          </div>
        ) : (
          payslips.map((p) => (
            <div
              key={p.id}
              className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        {MONTH_NAMES[p.month - 1]} {p.year}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isHr ? `${p.first_name} ${p.last_name} (${p.employee_code})` : 'Monthly Compensation'}
                      </p>
                    </div>
                  </div>
                  <Badge status={p.status} />
                </div>

                {/* Amount */}
                <div className="my-4">
                  <p className="text-xs text-slate-500 font-medium">Net Disbursed Amount</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                    {currencySymbol}{Number(p.net_salary).toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Gross: {currencySymbol}{Number(p.total_earnings).toLocaleString()}</span>
                    <span>Deductions: -{currencySymbol}{Number(p.total_deductions).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex justify-between">
                  <span>Present Days: {p.present_days}d</span>
                  <span>OT: {p.overtime_hours}h</span>
                  <span>LOP: {p.unpaid_leaves}d</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenView(p.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <a
                  href={api.getPayslipPdfUrl(p.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payslip Digital Preview Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Electronic Payslip Voucher"
        maxWidth="max-w-3xl"
      >
        {selectedPayslip && (
          <div className="space-y-5">
            {/* Payslip Header */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base tracking-wide">
                  {companySettings?.company_name || 'Egotech Technologies Inc.'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Monthly Payslip for {MONTH_NAMES[selectedPayslip.month - 1]} {selectedPayslip.year}
                </p>
              </div>
              <Badge status={selectedPayslip.status} />
            </div>

            {/* Employee Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee</span>
                <span className="font-semibold text-slate-800">
                  {selectedPayslip.first_name} {selectedPayslip.last_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee ID</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedPayslip.employee_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                <span className="font-semibold text-slate-800">
                  {selectedPayslip.department_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bank Account</span>
                <span className="font-semibold text-slate-800 font-mono">
                  •••• {selectedPayslip.bank_account_no?.slice(-4) || 'N/A'}
                </span>
              </div>
            </div>

            {/* Earnings vs Deductions Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-indigo-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between">
                  <span>Earnings Component</span>
                  <span>Amount ({currencySymbol})</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-2.5">
                    <span>Base Salary</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.base_salary}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>HRA Allowance</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.hra}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>Conveyance Allowance</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.conveyance}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>Medical Allowance</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.medical}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>Special Allowance</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.special_allowance}</span>
                  </div>
                  {selectedPayslip.bonus > 0 && (
                    <div className="flex justify-between p-2.5 bg-emerald-50 text-emerald-800">
                      <span>Performance Bonus</span>
                      <span className="font-bold">+{currencySymbol}{selectedPayslip.bonus}</span>
                    </div>
                  )}
                  {selectedPayslip.overtime_pay > 0 && (
                    <div className="flex justify-between p-2.5 bg-emerald-50 text-emerald-800">
                      <span>Overtime Pay ({selectedPayslip.overtime_hours} hrs)</span>
                      <span className="font-bold">+{currencySymbol}{selectedPayslip.overtime_pay}</span>
                    </div>
                  )}
                  {selectedPayslip.reimbursements > 0 && (
                    <div className="flex justify-between p-2.5 bg-indigo-50 text-indigo-900">
                      <span>Expense Reimbursements</span>
                      <span className="font-bold">+{currencySymbol}{Number(selectedPayslip.reimbursements).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <span>Total Gross</span>
                    <span>{currencySymbol}{selectedPayslip.total_earnings}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-rose-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between">
                  <span>Deduction Component</span>
                  <span>Amount ({currencySymbol})</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between p-2.5">
                    <span>Provident Fund (PF)</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.provident_fund}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>Professional Tax</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.professional_tax}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>Health Insurance / ESI</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.health_insurance}</span>
                  </div>
                  <div className="flex justify-between p-2.5">
                    <span>TDS / Income Tax</span>
                    <span className="font-semibold">{currencySymbol}{selectedPayslip.tds_tax}</span>
                  </div>
                  {selectedPayslip.lop_deduction > 0 && (
                    <div className="flex justify-between p-2.5 bg-rose-50 text-rose-800">
                      <span>Loss of Pay (Unpaid Leave)</span>
                      <span className="font-bold">-{currencySymbol}{selectedPayslip.lop_deduction}</span>
                    </div>
                  )}
                  {selectedPayslip.other_deductions > 0 && (
                    <div className="flex justify-between p-2.5 bg-rose-50 text-rose-800">
                      <span>Other Deductions</span>
                      <span className="font-bold">-{currencySymbol}{selectedPayslip.other_deductions}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-slate-50 font-bold text-rose-700 border-t border-slate-200">
                    <span>Total Deductions</span>
                    <span>-{currencySymbol}{selectedPayslip.total_deductions}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Payable Callout */}
            <div className="p-4 bg-emerald-600 text-white rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase font-semibold text-emerald-100">Net Salary Payable</p>
                <p className="text-2xl font-bold">{currencySymbol}{Number(selectedPayslip.net_salary).toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleEmailPayslip(selectedPayslip.id)}
                  disabled={emailingId === selectedPayslip.id}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{emailingId === selectedPayslip.id ? 'Sending...' : 'Email to Me'}</span>
                </button>
                <a
                  href={api.getPayslipPdfUrl(selectedPayslip.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official PDF</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
