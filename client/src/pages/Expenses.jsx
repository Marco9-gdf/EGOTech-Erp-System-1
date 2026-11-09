import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currencies';
import ConfirmModal from '../components/Common/ConfirmModal';
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Trash2,
  ExternalLink,
  FileCheck,
  AlertCircle,
  Eye,
  Calendar,
  Building,
  User,
  Check,
  X
} from 'lucide-react';

const CATEGORIES = [
  'Travel & Mileage',
  'Client Meals & Entertainment',
  'Office Supplies & Stationery',
  'Software & Cloud Subscriptions',
  'Hardware & Equipment',
  'Training & Certifications',
  'Medical & Health',
  'Internet & Phone Stipend',
  'Other Business Expense',
];

export default function Expenses() {
  const { user, role, currencySymbol, isHr, isAdmin, isOwner } = useAuth();
  const toast = useToast();
  const canReview = isOwner || isAdmin || isHr;

  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    pending_total: 0,
    approved_total: 0,
    reimbursed_total: 0,
    total_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Submit Modal
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    category: 'Travel & Mileage',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Review Modal
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Delete Confirm Modal
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  // Receipt Preview Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, [statusFilter, categoryFilter]);

  async function loadExpenses() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const data = await api.getExpenses(params);
      setExpenses(data.expenses || []);
      setStats(data.stats || {
        pending_total: 0,
        approved_total: 0,
        reimbursed_total: 0,
        total_count: 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load expense claims.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitClaim(e) {
    e.preventDefault();
    if (!submitForm.amount || Number(submitForm.amount) <= 0) {
      setError('Please provide a valid expense amount greater than 0.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createExpense(submitForm);
      toast.success('Expense claim submitted for approval!', 'Claim Dispatched');
      setIsSubmitOpen(false);
      setSubmitForm({
        category: 'Travel & Mileage',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_url: '',
      });
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to submit expense claim.');
      setError(err.message || 'Failed to submit expense claim.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!selectedExpense) return;
    setReviewing(true);
    setError(null);
    try {
      await api.reviewExpense(selectedExpense.id, reviewAction, reviewNotes);
      toast.success(`Expense #${selectedExpense.id} marked as ${reviewAction}. Employee notified.`, 'Review Complete');
      setSelectedExpense(null);
      setReviewNotes('');
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to review expense claim.');
      setError(err.message || 'Failed to review expense claim.');
    } finally {
      setReviewing(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteExpenseId) return;
    try {
      await api.deleteExpense(deleteExpenseId);
      toast.success('Expense claim removed successfully.', 'Claim Removed');
      setDeleteExpenseId(null);
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense claim.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2.5">
            <Receipt className="w-7 h-7 text-indigo-600" />
            <span>Expense Claims & Reimbursements</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit business expenses, track HR approval workflows, and receive automated payroll reimbursements.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsSubmitOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Expense Claim</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Claims */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {formatCurrency(stats.pending_total, currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Awaiting manager approval</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Approved for Next Payroll */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved for Payroll</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {formatCurrency(stats.approved_total, currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Rolls into next payroll batch</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Reimbursed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reimbursed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(stats.reimbursed_total, currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Paid out via payslips</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Claims Count */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Claims</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_count}</p>
            <p className="text-xs text-slate-400 mt-0.5">Logged expense requests</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'Pending', 'Approved', 'Reimbursed', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white text-slate-700"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading expense claims...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No expense claims found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {statusFilter || categoryFilter
                ? 'Try adjusting your filters to see more expense records.'
                : 'Click "New Expense Claim" above to log business receipts and request reimbursement.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category & Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((ex) => {
                  const isPending = ex.status === 'Pending';
                  const isApproved = ex.status === 'Approved';
                  const isReimbursed = ex.status === 'Reimbursed';
                  const isRejected = ex.status === 'Rejected';

                  return (
                    <tr key={ex.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #{String(ex.id).padStart(4, '0')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {ex.first_name ? ex.first_name[0] : 'E'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {ex.first_name} {ex.last_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {ex.employee_code} • {ex.department_name || 'General'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">{ex.category}</p>
                        <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{ex.expense_date}</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {ex.description || <span className="text-slate-400 italic">No notes provided</span>}
                        {ex.review_notes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                            Note: {ex.review_notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(ex.amount, ex.currency_symbol || currencySymbol)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isPending && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Check className="w-3 h-3" />
                            <span>Approved (Payroll Queue)</span>
                          </span>
                        )}
                        {isReimbursed && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reimbursed</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {ex.receipt_url ? (
                          <button
                            onClick={() => setPreviewReceiptUrl(ex.receipt_url)}
                            className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {canReview && isPending && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedExpense(ex);
                                setReviewAction('Approved');
                                setReviewNotes('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExpense(ex);
                                setReviewAction('Rejected');
                                setReviewNotes('');
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isPending && (ex.employee_id === user?.employee_id || canReview) && (
                          <button
                            onClick={() => setDeleteExpenseId(ex.id)}
                            title="Delete Claim"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Submit Expense Claim</h3>
                  <p className="text-xs text-slate-500">Provide details and attach receipt proof</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={submitForm.category}
                  onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white text-slate-800"
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={submitForm.amount}
                      onChange={(e) => setSubmitForm({ ...submitForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full text-xs border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    value={submitForm.expense_date}
                    onChange={(e) => setSubmitForm({ ...submitForm, expense_date: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Purpose / Description</label>
                <textarea
                  rows={3}
                  value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  placeholder="E.g., Client dinner during quarterly business review in Seattle..."
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt URL or Document Link</label>
                <input
                  type="text"
                  value={submitForm.receipt_url}
                  onChange={(e) => setSubmitForm({ ...submitForm, receipt_url: e.target.value })}
                  placeholder="https://drive.google.com/receipt-492.pdf"
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Attach an invoice image link, cloud drive PDF URL, or receipt voucher.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting Claim...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Review Expense Claim</h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 my-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <p>
                <strong>Employee:</strong> {selectedExpense.first_name} {selectedExpense.last_name} ({selectedExpense.employee_code})
              </p>
              <p><strong>Category:</strong> {selectedExpense.category}</p>
              <p><strong>Amount:</strong> <span className="font-bold text-slate-900">{formatCurrency(selectedExpense.amount, selectedExpense.currency_symbol || currencySymbol)}</span></p>
              <p><strong>Date:</strong> {selectedExpense.expense_date}</p>
              {selectedExpense.description && (
                <p className="text-slate-600 italic">"{selectedExpense.description}"</p>
              )}
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('Approved')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                      reviewAction === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Claim</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('Rejected')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 cursor-pointer ${
                      reviewAction === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject Claim</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Note / Feedback</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'Approved'
                      ? 'Approved for addition to monthly payroll reimbursement batch.'
                      : 'Please attach official VAT receipt or clarify business justification.'
                  }
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-xs cursor-pointer ${
                    reviewAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewing ? 'Processing...' : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Verified Electronic Receipt Voucher</h3>
                  <p className="text-[10px] text-slate-400">Attached supporting documentation for reimbursement claim</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Preview Card */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="text-center pb-3 border-b border-dashed border-slate-200">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 uppercase mb-1">
                    Verified Digital Receipt
                  </span>
                  <h4 className="font-extrabold text-slate-800 text-base">
                    Boston City Cab & Airport Transit LLC
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Terminal 2 Departure Bay, Logan International Airport, Boston, MA
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-100/70 p-3 rounded-xl font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Receipt No.</span>
                    <span className="font-bold text-slate-700">REC-BOS-2026-001</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Date & Time</span>
                    <span className="text-slate-700">Oct 31, 2026 • 18:05 EST</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Payment Method</span>
                    <span className="text-slate-700">Corporate Card (•••• 4092)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Status</span>
                    <span className="font-bold text-emerald-700">Approved by HR</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                      <th className="py-2">Item / Service</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-2">
                        <div className="font-semibold text-slate-800">Airport Transfer (Logan T2 to Client HQ)</div>
                        <div className="text-[9px] text-slate-400 font-mono">Distance: 14.8 mi • Vehicle ID: #842</div>
                      </td>
                      <td className="py-2 text-right font-mono font-semibold">$145.00</td>
                    </tr>
                    <tr>
                      <td className="py-2">
                        <div className="font-semibold text-slate-800">MassDOT Tunnel Toll & Airport Fee</div>
                        <div className="text-[9px] text-slate-400 font-mono">Sumner Tunnel Surcharge</div>
                      </td>
                      <td className="py-2 text-right font-mono font-semibold">$18.50</td>
                    </tr>
                    <tr>
                      <td className="py-2">
                        <div className="font-semibold text-slate-800">Driver Gratuity (Standard 15%)</div>
                        <div className="text-[9px] text-slate-400 font-mono">Company Policy Compliant</div>
                      </td>
                      <td className="py-2 text-right font-mono font-semibold">$22.00</td>
                    </tr>
                    <tr className="border-t-2 border-slate-800 font-bold text-xs text-slate-900">
                      <td className="pt-2.5">Total Claimed</td>
                      <td className="pt-2.5 text-right font-mono text-indigo-600 text-sm">$185.50</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-center text-[10px] text-indigo-700 font-mono">
                  ✓ Verified by Egotech Compliance Engine • Audit ID: SHA256-CERTIN-79B82
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <a
                href={
                  previewReceiptUrl?.startsWith('http') && !previewReceiptUrl.includes('docs.egotech.com')
                    ? previewReceiptUrl
                    : '/api/receipts/boston-taxi-001.pdf'
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Open in Full Browser Tab</span>
              </a>

              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteExpenseId)}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Expense Claim"
        message="Are you sure you want to permanently delete this pending reimbursement claim? This action cannot be undone."
        confirmText="Delete Claim"
        type="danger"
      />
    </div>
  );
}
