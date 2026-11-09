import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import ConfirmModal from '../components/Common/ConfirmModal';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  FileText,
  Play,
  AlertCircle,
  Plus,
  RefreshCw,
  Edit,
  Mail,
  Send,
  Check,
  Shield,
  Scale,
  FileSpreadsheet,
  XCircle,
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Payroll() {
  const { currencySymbol = '$' } = useAuth();
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Generate Batch Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genName, setGenName] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Finalize Batch Modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [batchToFinalize, setBatchToFinalize] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [finalizing, setFinalizing] = useState(false);

  // Reject Batch Modal (Replaces window.prompt)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [batchToReject, setBatchToReject] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Email Batch Confirmation Modal (Replaces window.confirm)
  const [emailConfirmModalOpen, setEmailConfirmModalOpen] = useState(false);
  const [batchToEmail, setBatchToEmail] = useState(null);

  // Edit Payslip Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState(null);
  const [bonusInput, setBonusInput] = useState(0);
  const [otherDeductionsInput, setOtherDeductionsInput] = useState(0);
  const [notesInput, setNotesInput] = useState('');
  const [savingPayslip, setSavingPayslip] = useState(false);

  // Email Distribution States
  const [emailingBatchId, setEmailingBatchId] = useState(null);
  const [emailingSingleId, setEmailingSingleId] = useState(null);
  const [emailNotification, setEmailNotification] = useState(null);

  // Maker-Checker Handlers
  const handleSubmitReview = async (batchId) => {
    try {
      await api.submitBatchForReview(batchId);
      toast.info('Batch submitted for Checker compliance review!', 'Maker Workflow');
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to submit batch for review.');
    }
  };

  const handleApproveBatch = async (batchId) => {
    try {
      await api.approveBatch(batchId, 'Statutory & Labour Code rules verified.');
      toast.success('Batch approved by Checker and cleared for disbursement!', 'Checker Approval');
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to approve batch.');
    }
  };

  const handleOpenRejectModal = (batch) => {
    setBatchToReject(batch);
    setRejectNotes('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!batchToReject) return;
    try {
      setRejecting(true);
      await api.rejectBatch(batchToReject.id, rejectNotes || 'Returned for adjustments.');
      toast.warning('Batch returned to Maker with remarks.', 'Batch Returned');
      setRejectModalOpen(false);
      setBatchToReject(null);
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to return batch.');
    } finally {
      setRejecting(false);
    }
  };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const bRes = await api.getPayrollBatches();
      setBatches(bRes.batches || []);

      const pRes = await api.getPayslips({ batch_id: selectedBatchId });
      setPayslips(pRes.payslips || []);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedBatchId]);

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      setGenError('');
      const res = await api.previewPayrollBatch(genMonth, genYear);
      setPreviewData(res);
    } catch (err) {
      setGenError(err.message || 'Failed to preview payroll.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      setGenerating(true);
      setGenError('');
      await api.generatePayrollBatch({
        month: genMonth,
        year: genYear,
        batch_name: genName || `${MONTH_NAMES[genMonth - 1]} ${genYear} Payroll Run`,
      });
      setGenerateModalOpen(false);
      setPreviewData(null);
      fetchPayroll();
    } catch (err) {
      setGenError(err.message || 'Failed to generate payroll batch.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalizeConfirm = async (e) => {
    e.preventDefault();
    try {
      setFinalizing(true);
      await api.finalizePayrollBatch(batchToFinalize.id, { payment_date: paymentDate });
      toast.success('Payroll batch successfully finalized and disbursed!', 'Disbursement Complete');
      setFinalizeModalOpen(false);
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize payroll.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleOpenEditPayslip = (p) => {
    setActivePayslip(p);
    setBonusInput(p.bonus || 0);
    setOtherDeductionsInput(p.other_deductions || 0);
    setNotesInput(p.notes || '');
    setEditModalOpen(true);
  };

  const handleSavePayslip = async (e) => {
    e.preventDefault();
    try {
      setSavingPayslip(true);
      await api.updatePayslip(activePayslip.id, {
        bonus: bonusInput,
        other_deductions: otherDeductionsInput,
        notes: notesInput,
      });
      toast.success('Employee payslip adjustments saved.', 'Updated');
      setEditModalOpen(false);
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to update payslip.');
    } finally {
      setSavingPayslip(false);
    }
  };

  const handleConfirmEmailBatch = async () => {
    if (!batchToEmail) return;
    try {
      setEmailingBatchId(batchToEmail.id);
      setEmailConfirmModalOpen(false);
      const res = await api.emailBatchPayslips(batchToEmail.id);
      toast.success(res.message || 'Payslips successfully emailed to all employees.', 'Email Complete');
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to email batch payslips.');
    } finally {
      setEmailingBatchId(null);
      setBatchToEmail(null);
    }
  };

  const handleEmailSingle = async (payslipId, employeeName) => {
    try {
      setEmailingSingleId(payslipId);
      await api.emailSinglePayslip(payslipId);
      toast.success(`Official payslip emailed to ${employeeName} successfully!`, 'Sent');
      fetchPayroll();
    } catch (err) {
      toast.error(err.message || 'Failed to email payslip.');
    } finally {
      setEmailingSingleId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Alert Banner */}
      {emailNotification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            emailNotification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {emailNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{emailNotification.message}</span>
          </div>
          <button
            onClick={() => setEmailNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Payroll Engine</h2>
          <p className="text-xs text-slate-500">Automated salary computation, deductions, batches, and PDF payslips</p>
        </div>
        <button
          onClick={() => {
            setGenError('');
            setPreviewData(null);
            setGenerateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Play className="w-4 h-4" />
          <span>Run Monthly Payroll</span>
        </button>
      </div>

      {/* Batches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {batches.map((b) => (
          <div
            key={b.id}
            onClick={() => setSelectedBatchId(b.id === selectedBatchId ? '' : b.id)}
            className={`p-5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs ${
              b.id === selectedBatchId
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {MONTH_NAMES[b.month - 1]} {b.year}
              </span>
              <div className="flex items-center space-x-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  b.checker_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                  b.checker_status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {b.checker_status || 'Draft'}
                </span>
                <Badge status={b.status} />
              </div>
            </div>

            <h4 className="mt-2 text-xl font-bold text-slate-800">
              {currencySymbol}{Number(b.total_net).toLocaleString()}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Gross: {currencySymbol}{Number(b.total_gross).toLocaleString()} • Deductions: {currencySymbol}{Number(b.total_deductions).toLocaleString()}
            </p>

            {/* Statutory Breakdown Line */}
            <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
              <span>PF: {currencySymbol}{Number(b.total_employer_pf || 0).toLocaleString()}</span>
              <span>ESIC: {currencySymbol}{Number(b.total_employer_esic || 0).toLocaleString()}</span>
              <span>PT: {currencySymbol}{Number(b.total_pt || 0).toLocaleString()}</span>
              <span>TDS: {currencySymbol}{Number(b.total_tds || 0).toLocaleString()}</span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="text-slate-400 font-medium">{b.payslip_count} Staff</span>
              {b.status === 'Draft' ? (
                <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                  {(!b.checker_status || b.checker_status === 'Draft') && (
                    <button
                      onClick={() => handleSubmitReview(b.id)}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-[10px] shadow-xs cursor-pointer"
                    >
                      Submit for Review
                    </button>
                  )}
                  {b.checker_status === 'Under Review' && (
                    <>
                      <button
                        onClick={() => handleApproveBatch(b.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10px] shadow-xs cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(b)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[10px] cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {b.checker_status === 'Approved' && (
                    <button
                      onClick={() => {
                        setBatchToFinalize(b);
                        setFinalizeModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-xs cursor-pointer"
                    >
                      Disburse & Finalize
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-600 font-semibold text-[11px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Disbursed</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchToEmail(b);
                      setEmailConfirmModalOpen(true);
                    }}
                    disabled={emailingBatchId === b.id}
                    title="Send itemized PDF payslip emails to all employees"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{emailingBatchId === b.id ? 'Sending...' : 'Email All'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Generated Payslips Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              {selectedBatchId ? `Filtered by Batch #${selectedBatchId}` : 'Showing all generated payslips'}
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <a
              href={api.getEcrDownloadUrl(selectedBatchId || batches[0]?.id || 1)}
              download
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Official Electronic Challan cum Return (ECR) for EPFO Unified Portal"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>EPFO ECR (.txt)</span>
            </a>

            <a
              href={api.getBankBatchDownloadUrl(selectedBatchId || batches[0]?.id || 1)}
              download
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Corporate Bank Batch Upload file (NACH / NEFT format)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bank NACH (.csv)</span>
            </a>

            <a
              href={api.getFormTDownloadUrl(selectedBatchId || batches[0]?.id || 1)}
              download
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Statutory Form T Register of Wages under Code on Wages"
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Form T Register (.csv)</span>
            </a>

            {selectedBatchId && (
              <button
                onClick={() => setSelectedBatchId('')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer ml-1"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Base Salary</th>
                <th className="py-3 px-4">Overtime / Reimb</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Payout</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    Loading payslips...
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No payslips found. Generate a payroll batch above.
                  </td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <p>{p.first_name} {p.last_name}</p>
                      <p className="text-[10px] text-slate-400">{p.employee_code} • {p.department_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {currencySymbol}{Number(p.base_salary).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {Number(p.overtime_pay) > 0 && (
                        <span className="text-emerald-600 block">
                          +{currencySymbol}{Number(p.overtime_pay).toLocaleString()} OT
                        </span>
                      )}
                      {Number(p.reimbursements) > 0 && (
                        <span className="text-indigo-600 block font-semibold">
                          +{currencySymbol}{Number(p.reimbursements).toLocaleString()} Reimb
                        </span>
                      )}
                      {!Number(p.overtime_pay) && !Number(p.reimbursements) && (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {currencySymbol}{Number(p.total_earnings).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-rose-600">
                      -{currencySymbol}{Number(p.total_deductions).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">
                      {currencySymbol}{Number(p.net_salary).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <Badge status={p.status} />
                        {p.email_sent_at && (
                          <span className="block text-[9px] text-indigo-600 font-medium">
                            ✉ Emailed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEmailSingle(p.id, `${p.first_name} ${p.last_name}`)}
                          disabled={emailingSingleId === p.id}
                          title={p.email_sent_at ? `Already emailed on ${p.email_sent_at} - Click to resend` : "Email Vector PDF Payslip"}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            p.email_sent_at
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          {emailingSingleId === p.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenEditPayslip(p)}
                          title="Adjust Bonus or Deductions"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={api.getPayslipPdfUrl(p.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download Official PDF Payslip"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Run Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Run & Compute Monthly Payroll"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {genError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
              <select
                value={genMonth}
                onChange={(e) => setGenMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                value={genYear}
                onChange={(e) => setGenYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${previewing ? 'animate-spin' : ''}`} />
                <span>{previewing ? 'Simulating...' : 'Preview Calculation'}</span>
              </button>
            </div>
          </div>

          {/* Preview Results Table */}
          {previewData && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-indigo-950">
                    Simulation for {previewData.month_name} {previewData.year}
                  </p>
                  <p className="text-indigo-700">Covering {previewData.employee_count} active employees</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-700 font-medium">Estimated Net Payout</p>
                  <p className="text-lg font-bold text-indigo-950">
                    {currencySymbol}{Number(previewData.summary.total_net).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Employee</th>
                      <th className="py-2 px-3">Days (Present/Unpaid)</th>
                      <th className="py-2 px-3">OT Pay</th>
                      <th className="py-2 px-3">Gross</th>
                      <th className="py-2 px-3">Deductions</th>
                      <th className="py-2 px-3">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.previews.map((p) => (
                      <tr key={p.employee_id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.employee_name}</td>
                        <td className="py-2 px-3 text-slate-600">
                          {p.present_days} / {p.unpaid_leaves} LOP
                        </td>
                        <td className="py-2 px-3 text-emerald-600">+{currencySymbol}{p.overtime_pay}</td>
                        <td className="py-2 px-3">{currencySymbol}{p.total_earnings}</td>
                        <td className="py-2 px-3 text-rose-600">-{currencySymbol}{p.total_deductions}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{currencySymbol}{p.net_salary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateBatch}
              disabled={generating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{generating ? 'Processing Batch...' : 'Generate & Commit Batch'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Finalize Batch Modal */}
      <Modal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        title="Disburse & Finalize Payroll"
      >
        <form onSubmit={handleFinalizeConfirm} className="space-y-4">
          <p className="text-xs text-slate-600">
            You are about to mark <strong>{batchToFinalize?.batch_name}</strong> as <strong>Paid</strong>.
            This action commits the disbarment date for all {batchToFinalize?.payslip_count} employee payslips.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment / Disbursement Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              required
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFinalizeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={finalizing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {finalizing ? 'Finalizing...' : 'Confirm Disbarment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Payslip Adjustments Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Adjust Bonus or Deductions"
      >
        <form onSubmit={handleSavePayslip} className="space-y-4">
          <p className="text-xs text-slate-600">
            Adjusting components for <strong>{activePayslip?.first_name} {activePayslip?.last_name}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Performance Bonus ($)</label>
            <input
              type="number"
              value={bonusInput}
              onChange={(e) => setBonusInput(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Other Deductions ($)</label>
            <input
              type="number"
              value={otherDeductionsInput}
              onChange={(e) => setOtherDeductionsInput(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Notes</label>
            <input
              type="text"
              placeholder="e.g. Annual spot bonus approved"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPayslip}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingPayslip ? 'Saving...' : 'Apply Adjustments'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Interactive Reject / Return to Maker Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Return Batch to Maker (Checker Review)"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-semibold">Reviewing Batch #{batchToReject?.id}: {batchToReject?.batch_name}</p>
            <p className="mt-0.5">Please specify the corrections or statutory re-allocations required before re-submitting.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Checker Return Remarks *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Please verify overtime hours for Department 2 and adjust special allowances under Labour Code 50% rule."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setRejectModalOpen(false)}
              disabled={rejecting}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={rejecting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>{rejecting ? 'Returning...' : 'Return to Maker'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Interactive Email Batch Confirm Modal */}
      <ConfirmModal
        isOpen={emailConfirmModalOpen}
        onClose={() => {
          setEmailConfirmModalOpen(false);
          setBatchToEmail(null);
        }}
        onConfirm={handleConfirmEmailBatch}
        title="Email All Batch Payslips"
        message={`Are you sure you want to email official itemized vector PDF payslips with SHA-256 digital verification seals to all ${batchToEmail?.payslip_count || ''} employees in this batch?`}
        confirmText="Send Payslip Emails"
        type="primary"
        loading={Boolean(emailingBatchId)}
      />
    </div>
  );
}
