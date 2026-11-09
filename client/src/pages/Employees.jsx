import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Briefcase,
  ChevronRight,
  DollarSign,
  AlertCircle,
  Crown,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function Employees() {
  const { user, role, currencySymbol = '₹', currencyCode = 'INR' } = useAuth();
  const toast = useToast();
  const isOwner = role === 'owner';
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Employee Profile Change Requests (HR Approval Workflow)
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [profileRequests, setProfileRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [requestsFilter, setRequestsFilter] = useState('Pending');

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'Full-Time',
    shift_id: 1,
    base_salary: isOwner ? 50000 : 5000,
    hra: isOwner ? 10000 : 1000,
    conveyance_allowance: isOwner ? 2000 : 200,
    medical_allowance: isOwner ? 1500 : 150,
    special_allowance: isOwner ? 3000 : 300,
    provident_fund: isOwner ? 2000 : 300,
    professional_tax: isOwner ? 200 : 60,
    health_insurance: isOwner ? 500 : 100,
    tds_tax: isOwner ? 2500 : 350,
    overtime_rate_per_hour: isOwner ? 250 : 35,
    bank_name: isOwner ? 'HDFC Bank' : 'State Bank of India',
    bank_account_no: isOwner ? '50100456789012' : '1234567890',
    bank_ifsc: isOwner ? 'HDFC0001234' : 'SBIN0001234',
    tax_id: isOwner ? 'ABCDE1234F' : 'PAN123456',
    create_account: true,
    account_role: 'employee',
    account_password: isOwner ? 'EgotechStaff2026!' : 'Password123!',
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees({
        search,
        department_id: selectedDept,
        status: selectedStatus,
      });
      setEmployees(res.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.getProfileRequests();
      setProfileRequests(res.requests || []);
    } catch (err) {
      console.error('Failed to load profile requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleReviewRequest = async (requestId, action) => {
    try {
      setReviewingId(requestId);
      const note = reviewNotes[requestId] || '';
      await api.reviewProfileRequest(requestId, {
        action,
        review_notes: note,
      });
      toast.success(
        action === 'Approved'
          ? 'Profile updates approved and updated in employee records.'
          : 'Profile update request has been rejected.',
        action === 'Approved' ? 'Changes Approved' : 'Request Rejected'
      );
      fetchProfileRequests();
      fetchEmployees();
    } catch (err) {
      toast.error(err.message || 'Failed to process request.');
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => {
    Promise.all([api.getDepartments(), api.getShifts()]).then(([dRes, sRes]) => {
      setDepartments(dRes.departments || []);
      setShifts(sRes.shifts || []);
      if (dRes.departments?.length > 0) {
        setFormData((prev) => ({ ...prev, department_id: dRes.departments[0].id }));
      }
    });
    fetchProfileRequests();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await api.createEmployee(formData);
      setAddModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingRequestsCount = profileRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isOwner ? 'Egotech Workforce Management' : 'Employee Management'}
          </h2>
          <p className="text-xs text-slate-500">
            {isOwner
              ? 'Egotech Technologies Inc. (Company #1) • Platform Organization Core Team & Payroll'
              : 'View workforce directory, compensation rules, and profiles'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchProfileRequests();
              setRequestsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center space-x-2 transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Profile Requests</span>
            {pendingRequestsCount > 0 ? (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                0
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setError('');
              setAddModalOpen(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition cursor-pointer ${
              isOwner
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isOwner ? '+ Add Egotech Employee' : 'Add New Employee'}</span>
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950">
          <div className="flex items-center space-x-2.5">
            <Crown className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Platform Owner View:</strong> Managing workforce for your proprietary entity <strong>Egotech Technologies Inc. (Company #1)</strong>. Indian Rupee (₹ INR) currency standard active.
            </span>
          </div>
          <a
            href="/clients"
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0"
          >
            Switch to Client Directory →
          </a>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, employee code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive</option>
            <option value="">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Base Salary</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Loading employees directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {emp.first_name[0]}
                          {emp.last_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-700">{emp.designation}</p>
                      <p className="text-[10px] text-slate-400">{emp.department_name || 'N/A'}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {currencySymbol}{Number(emp.base_salary || 0).toLocaleString()} / mo
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {emp.shift_name || 'Standard Day'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={emp.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {emp.joining_date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-medium text-xs transition"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Employee"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Personal & Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Job Assignment */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              2. Job Details & Shift
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department *</label>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Designation *</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  placeholder="e.g. Frontend Developer"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shift</label>
                <select
                  name="shift_id"
                  value={formData.shift_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Salary Structure */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              3. Initial Salary Structure ({currencySymbol} {currencyCode})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Base Salary</label>
                <input
                  type="number"
                  name="base_salary"
                  value={formData.base_salary}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">HRA Allowance</label>
                <input
                  type="number"
                  name="hra"
                  value={formData.hra}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">PF Deduction</label>
                <input
                  type="number"
                  name="provident_fund"
                  value={formData.provident_fund}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">TDS / Income Tax</label>
                <input
                  type="number"
                  name="tds_tax"
                  value={formData.tds_tax}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              4. Banking & Tax ID
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Account Number</label>
                <input
                  type="text"
                  name="bank_account_no"
                  value={formData.bank_account_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">PAN / Tax ID</label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 5: User Login Provisioning */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                5. Portal Login Account
              </h4>
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="create_account"
                  checked={formData.create_account}
                  onChange={handleInputChange}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable System Login for this Employee</span>
              </label>
            </div>

            {formData.create_account && (
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Account Access Role</label>
                  <select
                    name="account_role"
                    value={formData.account_role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="employee">Employee (Punch card, leaves, payslips)</option>
                    <option value="hr">HR Specialist (Attendance audit, leave review, payroll)</option>
                    <option value="admin">Company Administrator (Full company access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    name="account_password"
                    value={formData.account_password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                    required={formData.create_account}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating Employee...' : 'Confirm & Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Profile Update Requests Review Modal (HR Approval Queue) */}
      <Modal
        isOpen={requestsModalOpen}
        onClose={() => setRequestsModalOpen(false)}
        title="Employee Profile & Bank Detail Change Requests"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex space-x-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRequestsFilter('Pending')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  requestsFilter === 'Pending'
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending Review ({profileRequests.filter((r) => r.status === 'Pending').length})
              </button>
              <button
                type="button"
                onClick={() => setRequestsFilter('All')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  requestsFilter === 'All'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All History ({profileRequests.length})
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              Changes apply to database only after HR approval
            </span>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {profileRequests.filter((r) => requestsFilter === 'All' || r.status === requestsFilter).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No profile change requests found.</p>
                <p className="mt-0.5">When employees request changes to their phone, address, or bank details, they will appear here for verification.</p>
              </div>
            ) : (
              profileRequests
                .filter((r) => requestsFilter === 'All' || r.status === requestsFilter)
                .map((req) => {
                  let changes = {};
                  let currentData = {};
                  try {
                    changes = typeof req.changes_json === 'string' ? JSON.parse(req.changes_json) : (req.changes_json || {});
                  } catch (e) {
                    changes = {};
                  }
                  try {
                    currentData = typeof req.current_data_json === 'string' ? JSON.parse(req.current_data_json) : (req.current_data_json || {});
                  } catch (e) {
                    currentData = {};
                  }

                  const fieldLabels = {
                    first_name: 'First Name',
                    last_name: 'Last Name',
                    phone: 'Phone Number',
                    address: 'Residential Address',
                    bank_name: 'Bank Name',
                    bank_account_no: 'Account Number',
                    bank_ifsc: 'Bank IFSC Code',
                    tax_id: 'Tax ID / PAN',
                  };

                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            {req.first_name} {req.last_name}{' '}
                            <span className="text-xs font-mono font-normal text-slate-400">
                              ({req.employee_code} • {req.department_name || 'Staff'})
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Requested: <span className="font-medium">{req.created_at?.slice(0, 16)}</span>
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            req.status === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700">
                        <strong className="text-slate-900">Reason:</strong> {req.reason || 'General profile update.'}
                      </div>

                      {/* Diff Comparison Table */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                            <tr>
                              <th className="py-1.5 px-3">Field</th>
                              <th className="py-1.5 px-3">Current Value (DB)</th>
                              <th className="py-1.5 px-3">Requested Update</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(changes).length === 0 ? (
                              <tr>
                                <td colSpan={3} className="py-2 px-3 text-slate-400 text-center">
                                  No field changes detected.
                                </td>
                              </tr>
                            ) : (
                              Object.entries(changes).map(([field, newVal]) => {
                                const oldVal = currentData[field] ?? 'Empty';
                                return (
                                  <tr key={field} className="border-b border-slate-100 last:border-0">
                                    <td className="py-2 px-3 font-semibold text-slate-700">
                                      {fieldLabels[field] || field}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px] line-through">
                                      {String(oldVal || 'None')}
                                    </td>
                                    <td className="py-2 px-3 font-bold text-emerald-700 font-mono text-[11px] bg-emerald-50/40">
                                      {String(newVal || 'None')}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Action Bar */}
                      {req.status === 'Pending' ? (
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                          <input
                            type="text"
                            placeholder="HR review notes (e.g. Verified bank passbook)..."
                            value={reviewNotes[req.id] || ''}
                            onChange={(e) =>
                              setReviewNotes({ ...reviewNotes, [req.id]: e.target.value })
                            }
                            className="w-full sm:flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReviewRequest(req.id, 'Rejected')}
                              disabled={reviewingId === req.id}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewRequest(req.id, 'Approved')}
                              disabled={reviewingId === req.id}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition disabled:opacity-50 flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{reviewingId === req.id ? 'Applying...' : 'Approve & Apply'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                          <span>
                            Reviewed by: <strong>{req.reviewed_by_name || 'HR Admin'}</strong> on{' '}
                            {req.reviewed_at?.slice(0, 16)}
                          </span>
                          {req.review_notes && (
                            <span className="italic">Note: "{req.review_notes}"</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRequestsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              Close Queue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
