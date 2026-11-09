import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import ConfirmModal from '../components/Common/ConfirmModal';
import {
  KeyRound,
  UserPlus,
  Search,
  Lock,
  Copy,
  Check,
  Shield,
  Briefcase,
  User,
  AlertCircle,
  RefreshCw,
  Power,
  Trash2,
} from 'lucide-react';

export default function Accounts() {
  const { user, isOwner, role } = useAuth();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'employee',
    company_id: '',
  });

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newPassword, setNewPassword] = useState('NewPass123!');
  const [submittingReset, setSubmittingReset] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.getAccounts({ role: roleFilter });
      setAccounts(res.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    if (isOwner) {
      api.getAllCompanies().then((res) => setCompanies(res.companies || [])).catch(() => {});
    }
  }, [roleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingCreate(true);
      setError('');
      await api.createAccount(formData);
      setCreateModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: 'Password123!',
        role: 'employee',
        company_id: companies[0]?.id || '',
      });
      fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReset(true);
      await api.resetAccountPassword(selectedAccount.id, newPassword);
      setResetModalOpen(false);
      toast.success(`Password for ${selectedAccount.email} updated to: ${newPassword}`, 'Password Reset');
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleStatus = async (acc) => {
    const nextStatus = acc.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.updateAccountStatus(acc.id, nextStatus);
      toast.info(`Account status updated to ${nextStatus}`, 'Status Changed');
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || 'Failed to update account status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await api.deleteAccount(accountToDelete.id);
      toast.success(`Login account for ${accountToDelete.email} removed.`, 'Account Deleted');
      setAccountToDelete(null);
      fetchAccounts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.');
    }
  };

  const handleCopyCredentials = (acc) => {
    const text = `Egotech User Login:
Email: ${acc.email}
Role: ${acc.role.toUpperCase()}
Organization: ${acc.company_name || 'Egotech Technologies'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    toast.info(`Login details for ${acc.email} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAccounts = accounts.filter((a) =>
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
    (a.company_name && a.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Accounts & Logins</h2>
          <p className="text-xs text-slate-500">
            {isOwner
              ? 'Manage all platform logins across client companies, reset passwords, and assign roles'
              : 'Manage employee and HR login credentials for your company'}
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User Login</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Roles</option>
            {isOwner && <option value="owner">Platform Owner</option>}
            <option value="admin">Administrator</option>
            <option value="hr">HR Manager</option>
            <option value="employee">Employee</option>
          </select>

          <span className="text-xs text-slate-400 font-medium">{filteredAccounts.length} Logins</span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Account User</th>
                <th className="py-3 px-4">Role</th>
                {isOwner && <th className="py-3 px-4">Organization</th>}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} className="py-8 text-center text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} className="py-8 text-center text-slate-400">
                    No accounts found matching filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 shadow-xs ${
                          acc.role === 'owner'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : acc.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.role === 'hr'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {acc.name ? acc.name[0].toUpperCase() : acc.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">{acc.name || acc.display_name}</p>
                          <p className="text-[11px] font-mono text-slate-400">{acc.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={acc.role} label={acc.role.toUpperCase()} />
                    </td>
                    {isOwner && (
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-700">{acc.company_name || 'Egotech'}</p>
                        <p className="text-[10px] text-slate-400">{acc.company_plan || 'Enterprise'}</p>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <Badge status={acc.status || 'Active'} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {acc.created_at ? acc.created_at.split(' ')[0] : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Copy Info Button */}
                        <button
                          onClick={() => handleCopyCredentials(acc)}
                          title="Copy Login Details"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          {copiedId === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setSelectedAccount(acc);
                            setNewPassword('NewPass123!');
                            setResetModalOpen(true);
                          }}
                          title="Reset Password"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Suspend/Active Button */}
                        {acc.id !== user.id && acc.role !== 'owner' && (
                          <button
                            onClick={() => handleToggleStatus(acc)}
                            title={acc.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              acc.status === 'Active'
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Account Button */}
                        {acc.id !== user.id && acc.role !== 'owner' && (
                          <button
                            onClick={() => setAccountToDelete(acc)}
                            title="Delete Account"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Rachel Green"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email Address *</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="employee">Employee</option>
                <option value="hr">HR Specialist</option>
                <option value="admin">Company Administrator</option>
                {isOwner && <option value="owner">Platform Owner</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>
          </div>

          {isOwner && companies.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Organization</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCreate}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submittingCreate ? 'Creating Account...' : 'Confirm & Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Account Password"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Setting new login password for: <strong>{selectedAccount?.email}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
            <div className="relative">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 4 characters. The user can immediately log in with this new password.
            </p>
          </div>

          <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReset}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submittingReset ? 'Resetting...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User Login"
        message={`Are you sure you want to permanently delete the login credentials for ${accountToDelete?.email}? They will no longer be able to access the Egotech SaaS platform.`}
        confirmText="Delete Account"
        type="danger"
      />
    </div>
  );
}
