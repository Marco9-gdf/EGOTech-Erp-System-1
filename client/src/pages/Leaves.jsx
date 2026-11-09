import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import {
  CalendarDays,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

export default function Leaves() {
  const { isHr } = useAuth();
  const toast = useToast();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Apply Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    days_count: 1,
    reason: '',
  });
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Review Modal (HR)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [typesRes, balRes, reqRes] = await Promise.all([
        api.getLeaveTypes(),
        api.getMyBalances(),
        api.getLeaveRequests({ status: statusFilter }),
      ]);
      setLeaveTypes(typesRes.leave_types || []);
      setBalances(balRes.balances || []);
      setRequests(reqRes.requests || []);
      if (typesRes.leave_types?.length > 0 && !applyForm.leave_type_id) {
        setApplyForm((prev) => ({ ...prev, leave_type_id: typesRes.leave_types[0].id }));
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [statusFilter]);

  // Recalculate days count when dates change
  const handleDateChange = (field, val) => {
    const updated = { ...applyForm, [field]: val };
    if (updated.start_date && updated.end_date) {
      const s = new Date(updated.start_date);
      const e = new Date(updated.end_date);
      if (e >= s) {
        let count = 0;
        const cur = new Date(s);
        while (cur <= e) {
          const d = cur.getDay();
          if (d !== 0 && d !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        updated.days_count = Math.max(1, count);
      }
    }
    setApplyForm(updated);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingApply(true);
      setApplyError('');
      await api.applyLeave(applyForm);
      toast.success('Leave application submitted for approval!', 'Time Off Applied');
      setApplyModalOpen(false);
      setApplyForm({
        leave_type_id: leaveTypes[0]?.id || '',
        start_date: '',
        end_date: '',
        days_count: 1,
        reason: '',
      });
      fetchLeaveData();
    } catch (err) {
      setApplyError(err.message || 'Failed to submit leave application.');
      toast.error(err.message || 'Failed to submit leave application.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleOpenReview = (req, status) => {
    setSelectedRequest(req);
    setReviewStatus(status);
    setReviewNotes('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      await api.reviewLeave(selectedRequest.id, reviewStatus, reviewNotes);
      toast.success(
        `Leave request for ${selectedRequest.employee_name || 'employee'} marked as ${reviewStatus}.`,
        'Leave Review Completed'
      );
      setReviewModalOpen(false);
      fetchLeaveData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Leave Management</h2>
          <p className="text-xs text-slate-500">Apply for time off, view available quotas, and manage requests</p>
        </div>
        <button
          onClick={() => {
            setApplyError('');
            setApplyModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map((b) => {
          const remaining = Math.max(0, b.total_days - b.used_days);
          const pct = Math.min(100, Math.round(((b.used_days || 0) / (b.total_days || 1)) * 100));
          return (
            <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{b.leave_type_name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {remaining}d left
                </span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-2 font-sans">
                {remaining} <span className="text-xs font-normal text-slate-400">/ {b.total_days} days</span>
              </p>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>Used: {b.used_days}d</span>
                <span>{pct}% utilized</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {isHr ? 'Workforce Leave Requests' : 'My Leave Request History'}
            </h3>
            <p className="text-xs text-slate-400">
              {isHr ? 'Manage and approve employee time-off applications' : 'Track the review status of your submitted time-off requests'}
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            {['', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {status || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                {isHr && <th className="py-3 px-4">Employee</th>}
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Date Range</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                {isHr && <th className="py-3 px-4 text-right">HR Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isHr ? 7 : 6} className="py-8 text-center text-slate-400">
                    Loading leave requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={isHr ? 7 : 6} className="py-8 text-center text-slate-400">
                    No leave applications found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    {isHr && (
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <p>{req.first_name} {req.last_name}</p>
                        <p className="text-[10px] text-slate-400">{req.department_name}</p>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{req.leave_type_name}</span>
                      {req.is_paid ? (
                        <span className="ml-1 text-[10px] text-emerald-600 font-medium">(Paid)</span>
                      ) : (
                        <span className="ml-1 text-[10px] text-amber-600 font-medium">(Unpaid LOP)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {req.start_date} to {req.end_date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {req.days_count} {req.days_count === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      <p className="truncate">{req.reason}</p>
                      {req.review_notes && (
                        <p className="text-[10px] text-slate-400 italic">HR: {req.review_notes}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={req.status} />
                    </td>
                    {isHr && (
                      <td className="py-3.5 px-4 text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenReview(req, 'Approved')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenReview(req, 'Rejected')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Submit Leave Application"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type *</label>
            <select
              value={applyForm.leave_type_id}
              onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_paid ? '(Paid Leave)' : '(Unpaid LOP)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={applyForm.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={applyForm.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Working Days Requested
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={applyForm.days_count}
              onChange={(e) => setApplyForm({ ...applyForm, days_count: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave *</label>
            <textarea
              rows="3"
              placeholder="Please provide details for HR review..."
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApplyModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingApply}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submittingApply ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Review Modal (HR) */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${reviewStatus} Leave Request`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to mark this leave request as <strong>{reviewStatus}</strong>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Review Notes / Remarks</label>
            <textarea
              rows="3"
              placeholder="Optional notes to the employee..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${
                reviewStatus === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submittingReview ? 'Processing...' : `Confirm ${reviewStatus}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
