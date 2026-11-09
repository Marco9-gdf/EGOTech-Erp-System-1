import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Building,
  Calendar,
  CreditCard,
  Edit,
  DollarSign,
  Clock,
  Shield,
  Save,
  CheckCircle2,
  FileText,
  UploadCloud,
  Calculator,
  Award,
  CheckCircle,
  XCircle,
  Trash2,
  Receipt,
  Download,
  AlertTriangle,
} from 'lucide-react';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { currencySymbol = '$' } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit Salary Modal
  const [editSalaryOpen, setEditSalaryOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({});
  const [savingSalary, setSavingSalary] = useState(false);

  // Digital Document Locker State
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    document_type: 'Aadhaar Card',
    file_name: '',
    file_size: '185 KB',
  });

  // FnF Settlement State
  const [existingFnf, setExistingFnf] = useState(null);
  const [fnfPreview, setFnfPreview] = useState(null);
  const [computingFnf, setComputingFnf] = useState(false);
  const [savingFnf, setSavingFnf] = useState(false);
  const [fnfParams, setFnfParams] = useState({
    resignation_date: new Date().toISOString().split('T')[0],
    last_working_day: new Date().toISOString().split('T')[0],
    notice_period_days: 30,
    notice_served_days: 30,
    reason: 'Voluntary Resignation',
  });

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await api.getEmployeeDocuments(id);
      setDocuments(res.documents || []);
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchFnfRecord = async () => {
    try {
      const res = await api.getEmployeeFnF(id);
      setExistingFnf(res.settlement || null);
    } catch (e) {
      // non-fatal
    }
  };

  const handleCalculateFnF = async (customParams = null) => {
    try {
      setComputingFnf(true);
      const payload = customParams || fnfParams;
      const res = await api.previewFnF({
        employee_id: id,
        ...payload,
      });
      setFnfPreview(res.preview);
    } catch (err) {
      toast.error(err.message || 'Failed to compute FnF preview.');
    } finally {
      setComputingFnf(false);
    }
  };

  const handleSaveFnF = async () => {
    if (!fnfPreview) return;
    try {
      setSavingFnf(true);
      await api.saveFnF({
        employee_id: id,
        resignation_date: fnfParams.resignation_date,
        last_working_day: fnfParams.last_working_day,
        reason: fnfParams.reason,
        basic_da_monthly: fnfPreview.statutory_components.basic_plus_da_monthly,
        gratuity_years: fnfPreview.tenure.gratuity_qualifying_years,
        gratuity_amount: fnfPreview.statutory_components.gratuity_amount,
        earned_leaves_days: fnfPreview.statutory_components.earned_leaves_days,
        leave_encashment_amount: fnfPreview.statutory_components.leave_encashment_amount,
        notice_period_days: fnfPreview.statutory_components.notice_period_days,
        notice_shortfall_days: fnfPreview.statutory_components.notice_shortfall_days,
        notice_pay_deduction: fnfPreview.statutory_components.notice_pay_deduction,
        pending_salary: fnfPreview.statutory_components.pending_salary,
        reimbursements: fnfPreview.statutory_components.pending_reimbursements,
        total_payable: fnfPreview.statutory_components.total_payable,
      });
      toast.success('Full & Final settlement finalized! Employee status set to Relieved.', 'FnF Finalized');
      fetchFnfRecord();
      fetchDetail();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize FnF settlement.');
    } finally {
      setSavingFnf(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docForm.file_name) {
      toast.warning('Please enter a file name.');
      return;
    }
    try {
      await api.uploadEmployeeDocument({
        employee_id: id,
        document_type: docForm.document_type,
        file_name: docForm.file_name,
        file_url: `/uploads/documents/${docForm.file_name}`,
        file_size: docForm.file_size || '180 KB',
      });
      toast.success('Document uploaded to locker and queued for verification.', 'Document Uploaded');
      setUploadDocOpen(false);
      setDocForm({ document_type: 'Aadhaar Card', file_name: '', file_size: '185 KB' });
      fetchDocuments();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document.');
    }
  };

  const handleVerifyDocument = async (docId, status) => {
    try {
      await api.verifyEmployeeDocument(docId, status);
      toast.success(`Document marked as ${status}.`, 'Verification Status');
      fetchDocuments();
    } catch (err) {
      toast.error(err.message || 'Failed to update verification status.');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await api.deleteEmployeeDocument(docId);
      toast.success('Document removed from locker.', 'Document Deleted');
      fetchDocuments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document.');
    }
  };

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployeeById(id);
      setData(res);
      if (res.salary_structure) {
        setSalaryForm(res.salary_structure);
      }
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchDocuments();
    fetchFnfRecord();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'fnf' && !fnfPreview && !existingFnf) {
      handleCalculateFnF();
    }
  }, [activeTab, existingFnf]);

  const handleSalaryChange = (e) => {
    const { name, value } = e.target;
    setSalaryForm((prev) => ({
      ...prev,
      [name]: Number(value) || 0,
    }));
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      setSavingSalary(true);
      await api.updateSalaryStructure(id, salaryForm);
      toast.success('Salary structure updated successfully.', 'Salary Updated');
      setEditSalaryOpen(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.message || 'Failed to update salary structure.');
    } finally {
      setSavingSalary(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded-lg" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const { employee, salary_structure, leave_balances, recent_attendance } = data;

  const totalEarningsEst =
    (salary_structure?.base_salary || 0) +
    (salary_structure?.hra || 0) +
    (salary_structure?.conveyance_allowance || 0) +
    (salary_structure?.medical_allowance || 0) +
    (salary_structure?.special_allowance || 0);

  const totalDeductionsEst =
    (salary_structure?.provident_fund || 0) +
    (salary_structure?.professional_tax || 0) +
    (salary_structure?.health_insurance || 0) +
    (salary_structure?.tds_tax || 0);

  const netSalaryEst = Math.max(0, totalEarningsEst - totalDeductionsEst);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/employees"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xl shadow-md shadow-indigo-600/20">
            {employee.first_name[0]}
            {employee.last_name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-bold text-slate-800">
                {employee.first_name} {employee.last_name}
              </h2>
              <Badge status={employee.status} />
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {employee.designation} • {employee.department_name || 'General'}
            </p>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Code: {employee.employee_code} • Shift: {employee.shift_name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setEditSalaryOpen(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Configure Salary</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Profile & Bank Details
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'salary'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Salary Structure
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Leave Balances
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Recent Attendance
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document Locker</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-100 text-slate-600 rounded-full font-bold">
            {documents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('fnf')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'fnf'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
          <span>FnF Settlement (Act 1972)</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Employment Details
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-800">{employee.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Phone</span>
                <span className="font-semibold text-slate-800">{employee.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Employment Type</span>
                <span className="font-semibold text-slate-800">{employee.employment_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Joining Date</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.joining_date}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Assigned Shift</span>
                <span className="font-semibold text-slate-800">
                  {employee.shift_name} ({employee.shift_start?.slice(0, 5)} - {employee.shift_end?.slice(0, 5)})
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Banking & Disbursement Details
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Bank Name</span>
                <span className="font-semibold text-slate-800">{employee.bank_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Account Number</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.bank_account_no || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Tax ID / PAN / SSN</span>
                <span className="font-semibold text-slate-800 font-mono">{employee.tax_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Disbursement Method</span>
                <span className="font-semibold text-emerald-600">Direct Bank Deposit (Automated)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Salary Structure */}
      {activeTab === 'salary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Monthly Gross Earnings</p>
              <h4 className="mt-1 text-2xl font-bold text-slate-800">${totalEarningsEst.toLocaleString()}</h4>
              <p className="mt-1 text-[11px] text-slate-400">Base + Allowances</p>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Monthly Deductions</p>
              <h4 className="mt-1 text-2xl font-bold text-rose-600">${totalDeductionsEst.toLocaleString()}</h4>
              <p className="mt-1 text-[11px] text-slate-400">PF, ESI, Taxes</p>
            </div>
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-xs">
              <p className="text-xs text-emerald-700 font-medium">Estimated Net Salary</p>
              <h4 className="mt-1 text-2xl font-bold text-emerald-900">${netSalaryEst.toLocaleString()}</h4>
              <p className="mt-1 text-[11px] text-emerald-600">Net monthly payout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings breakdown */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">
                Earnings Breakdown
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Base Salary</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.base_salary || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">House Rent Allowance (HRA)</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.hra || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Conveyance Allowance</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.conveyance_allowance || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Medical Allowance</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.medical_allowance || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Special Allowance</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.special_allowance || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Overtime Hourly Rate</span>
                  <span className="font-semibold text-indigo-600">{currencySymbol}{salary_structure?.overtime_rate_per_hour || 0} / hr</span>
                </div>
              </div>
            </div>

            {/* Deductions breakdown */}
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3">
                Statutory Deductions
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Provident Fund (PF)</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.provident_fund || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Professional Tax</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.professional_tax || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">Health Insurance (ESI)</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.health_insurance || 0}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-600">TDS / Estimated Income Tax</span>
                  <span className="font-semibold text-slate-800">{currencySymbol}{salary_structure?.tds_tax || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {leave_balances?.map((b) => (
            <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs text-center">
              <p className="text-3xl font-bold text-slate-800">
                {Math.max(0, b.total_days - b.used_days)}
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-1">{b.leave_type_name}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] text-slate-400">
                <span>Total: {b.total_days}d</span>
                <span>Used: {b.used_days}d</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 overflow-hidden">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Recent 10 Days Attendance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Hours</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_attendance?.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-3 font-medium text-slate-800">{r.date}</td>
                    <td className="py-3 px-3">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{r.clock_in || '--'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{r.clock_out || '--'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{r.working_hours ? `${r.working_hours}h` : '--'}</td>
                    <td className="py-3 px-3 text-slate-400">{r.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: DIGITAL DOCUMENT LOCKER                                      */}
      {/* =================================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Digital Document Vault
                </h3>
                <p className="text-xs text-slate-400">
                  Secure verified storage for Aadhaar (masked), PAN, degree certificates, and relieving letters
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUploadDocOpen(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>

            {loadingDocs ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No documents uploaded yet. Click "Upload Document" to add Aadhaar or certificates.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">{doc.document_type}</h4>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{doc.file_name}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          doc.verification_status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : doc.verification_status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {doc.verification_status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                      <span>Size: {doc.file_size || '150 KB'}</span>
                      <span className="font-mono text-[10px]">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(doc.id, 'Verified')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-lg border border-emerald-200 cursor-pointer flex items-center gap-1"
                          title="Mark as Verified"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyDocument(doc.id, 'Rejected')}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold rounded-lg border border-rose-200 cursor-pointer flex items-center gap-1"
                          title="Mark as Rejected"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: FULL & FINAL (FnF) SETTLEMENT CALCULATOR                    */}
      {/* =================================================================== */}
      {activeTab === 'fnf' && (
        <div className="space-y-6">
          {existingFnf ? (
            <div className="p-6 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Full & Final Settlement Finalized</h3>
                    <p className="text-xs text-slate-500">
                      Payment of Gratuity Act 1972 Section 4(2) compliant settlement was executed on {new Date(existingFnf.settled_at || existingFnf.created_at).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500 text-white font-bold text-xs rounded-full">
                  Settlement {existingFnf.status || 'Approved'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block">Gratuity Payable ({existingFnf.gratuity_years} yrs)</span>
                  <span className="text-sm font-bold text-slate-800">₹{Number(existingFnf.gratuity_amount || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block">Leave Encashment</span>
                  <span className="text-sm font-bold text-slate-800">₹{Number(existingFnf.leave_encashment_amount || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block">Notice Shortfall Recovery</span>
                  <span className="text-sm font-bold text-rose-600">-₹{Number(existingFnf.notice_pay_deduction || 0).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block font-semibold">Net Total Disbursed</span>
                  <span className="text-base font-extrabold text-emerald-700">₹{Number(existingFnf.total_payable || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Settlement Parameters Form */}
              <div className="lg:col-span-1 p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Settlement Parameters
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Resignation Date</label>
                    <input
                      type="date"
                      value={fnfParams.resignation_date}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFnfParams((p) => ({ ...p, resignation_date: val }));
                        handleCalculateFnF({ ...fnfParams, resignation_date: val });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Last Working Day (LWD)</label>
                    <input
                      type="date"
                      value={fnfParams.last_working_day}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFnfParams((p) => ({ ...p, last_working_day: val }));
                        handleCalculateFnF({ ...fnfParams, last_working_day: val });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Mandatory Notice</label>
                      <input
                        type="number"
                        value={fnfParams.notice_period_days}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFnfParams((p) => ({ ...p, notice_period_days: val }));
                          handleCalculateFnF({ ...fnfParams, notice_period_days: val });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Served Days</label>
                      <input
                        type="number"
                        value={fnfParams.notice_served_days}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFnfParams((p) => ({ ...p, notice_served_days: val }));
                          handleCalculateFnF({ ...fnfParams, notice_served_days: val });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Reason for Separation</label>
                    <select
                      value={fnfParams.reason}
                      onChange={(e) => setFnfParams((p) => ({ ...p, reason: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Voluntary Resignation">Voluntary Resignation</option>
                      <option value="Retirement">Retirement</option>
                      <option value="End of Contract">End of Contract</option>
                      <option value="Mutual Separation">Mutual Separation</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCalculateFnF()}
                    disabled={computingFnf}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Calculator className={`w-3.5 h-3.5 ${computingFnf ? 'animate-spin' : ''}`} />
                    <span>{computingFnf ? 'Recomputing...' : 'Recompute FnF Values'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Statutory FnF Breakdown Card */}
              <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Payment of Gratuity Act 1972 & FnF Breakdown</h3>
                      <p className="text-[11px] text-slate-400">Section 4(2) 15/26 Formula & Statutory Encashment</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    fnfPreview?.tenure?.is_gratuity_eligible
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {fnfPreview?.tenure?.is_gratuity_eligible ? 'Eligible for Gratuity (5+ Yrs)' : 'Not Gratuity Eligible (<5 Yrs)'}
                  </span>
                </div>

                {fnfPreview && (
                  <div className="space-y-4 text-xs">
                    {/* Tenure summary */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 flex justify-between items-center">
                      <div>
                        <span className="font-bold">Total Service Tenure: </span>
                        <span>{fnfPreview.tenure.years} Years, {fnfPreview.tenure.months} Months ({fnfPreview.tenure.total_days} days)</span>
                      </div>
                      <div className="font-semibold text-[11px]">
                        Qualifying Gratuity Years: <span className="font-bold">{fnfPreview.tenure.gratuity_qualifying_years} Years</span>
                      </div>
                    </div>

                    {/* Table of Components */}
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3">Settlement Component</th>
                          <th className="py-2.5 px-3">Statutory Basis / Rule</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            Gratuity (Payment of Gratuity Act 1972)
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            [15 × (Basic+DA) × {fnfPreview.tenure.gratuity_qualifying_years}] / 26
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +₹{fnfPreview.statutory_components.gratuity_amount.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            Leave Encashment
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {fnfPreview.statutory_components.earned_leaves_days} Earned Leave days @ (Basic+DA)/30
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +₹{fnfPreview.statutory_components.leave_encashment_amount.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            Final Month Salary (Up to LWD)
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            Prorated days worked in final pay cycle
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +₹{fnfPreview.statutory_components.pending_salary.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            Approved Expense Reimbursements
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            Pending unreimbursed approved claims
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +₹{fnfPreview.statutory_components.pending_reimbursements.toLocaleString()}
                          </td>
                        </tr>
                        {fnfPreview.statutory_components.notice_shortfall_days > 0 && (
                          <tr className="bg-rose-50/50">
                            <td className="py-2.5 px-3 font-semibold text-rose-700">
                              Notice Period Shortfall Recovery
                            </td>
                            <td className="py-2.5 px-3 text-rose-600 text-[11px]">
                              {fnfPreview.statutory_components.notice_shortfall_days} days shortfall @ Gross/30
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                              -₹{fnfPreview.statutory_components.notice_pay_deduction.toLocaleString()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Total Disbursable Box */}
                    <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white flex items-center justify-between shadow-md">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-emerald-100 font-bold block">
                          Net Full & Final Payable
                        </span>
                        <span className="text-2xl font-black">
                          ₹{fnfPreview.statutory_components.total_payable.toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveFnF}
                        disabled={savingFnf}
                        className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{savingFnf ? 'Finalizing...' : 'Finalize & Record Settlement'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadDocOpen}
        onClose={() => setUploadDocOpen(false)}
        title="Upload Document to Vault"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
            <select
              value={docForm.document_type}
              onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="Aadhaar Card">Aadhaar Card (Masked)</option>
              <option value="PAN Card">PAN Card</option>
              <option value="Degree Certificate">Degree / Educational Certificate</option>
              <option value="Relieving Letter">Previous Relieving / Experience Letter</option>
              <option value="Signed Offer Letter">Signed Offer & Appointment Letter</option>
              <option value="Form 12BB Proof">Form 12BB Investment Proof</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document File Name</label>
            <input
              type="text"
              placeholder="e.g. pan_card_scanned.pdf"
              value={docForm.file_name}
              onChange={(e) => setDocForm({ ...docForm, file_name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated File Size</label>
            <input
              type="text"
              placeholder="e.g. 180 KB"
              value={docForm.file_size}
              onChange={(e) => setDocForm({ ...docForm, file_size: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUploadDocOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Upload to Vault
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure Salary Modal */}
      <Modal
        isOpen={editSalaryOpen}
        onClose={() => setEditSalaryOpen(false)}
        title="Update Salary Components"
      >
        <form onSubmit={handleSaveSalary} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Monthly Salary ($)</label>
              <input
                type="number"
                name="base_salary"
                value={salaryForm.base_salary || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HRA Allowance ($)</label>
              <input
                type="number"
                name="hra"
                value={salaryForm.hra || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Conveyance Allowance ($)</label>
              <input
                type="number"
                name="conveyance_allowance"
                value={salaryForm.conveyance_allowance || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Allowance ($)</label>
              <input
                type="number"
                name="medical_allowance"
                value={salaryForm.medical_allowance || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Special Allowance ($)</label>
              <input
                type="number"
                name="special_allowance"
                value={salaryForm.special_allowance || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Overtime Rate ($/hr)</label>
              <input
                type="number"
                name="overtime_rate_per_hour"
                value={salaryForm.overtime_rate_per_hour || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Provident Fund (PF) ($)</label>
              <input
                type="number"
                name="provident_fund"
                value={salaryForm.provident_fund || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">TDS / Income Tax ($)</label>
              <input
                type="number"
                name="tds_tax"
                value={salaryForm.tds_tax || 0}
                onChange={handleSalaryChange}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditSalaryOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSalary}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingSalary ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
