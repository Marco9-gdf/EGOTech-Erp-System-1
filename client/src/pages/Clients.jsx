import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import {
  Building2,
  Plus,
  Search,
  Users,
  Shield,
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Crown,
  Palette,
  Sparkles,
  Image as ImageIcon,
  Edit,
  Save,
  Coins,
} from 'lucide-react';
import { CURRENCY_OPTIONS } from '../utils/currencies';

const LOGO_PRESETS = [
  { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png', color: '#0078d4' },
  { name: 'Google Cloud', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png', color: '#4285f4' },
  { name: 'Amazon AWS', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/512px-Amazon_Web_Services_Logo.svg.png', color: '#ff9900' },
  { name: 'Apple Inc.', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/488px-Apple_logo_black.svg.png', color: '#1e293b' },
];

const COLOR_PRESETS = [
  { name: 'Microsoft Blue', hex: '#0078d4' },
  { name: 'Egotech Indigo', hex: '#4f46e5' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Purple Violet', hex: '#7c3aed' },
  { name: 'Slate Dark', hex: '#1e293b' },
  { name: 'Amber Gold', hex: '#d97706' },
  { name: 'Rose Red', hex: '#e11d48' },
];

export default function Clients() {
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Onboard Modal State
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  // Edit / Co-Brand Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currency_symbol: '$',
    currency_code: 'USD',
    plan: 'Enterprise',
    status: 'Active',
    logo_url: '',
    primary_color: '#0078d4',
    powered_by_text: 'Powered by Egotech',
    custom_tagline: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  // Form State for Onboarding
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    currency_symbol: '$',
    currency_code: 'USD',
    plan: 'Enterprise',
    max_employees: 100,
    logo_url: '',
    primary_color: '#0078d4',
    powered_by_text: 'Powered by Egotech',
    custom_tagline: '',
    admin_name: '',
    admin_email: '',
    admin_password: 'AdminPassword123!',
  });

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [compRes, statsRes] = await Promise.all([
        api.getCompanies(),
        api.getPlatformStats(),
      ]);
      setCompanies(compRes.companies || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err.message || 'Failed to load client organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenEditModal = (comp) => {
    setEditingCompany(comp);
    setEditMsg('');
    setError('');
    setEditForm({
      name: comp.name || '',
      email: comp.email || '',
      phone: comp.phone || '',
      address: comp.address || '',
      currency_symbol: comp.currency_symbol || '$',
      currency_code: comp.currency_code || 'USD',
      plan: comp.plan || 'Enterprise',
      status: comp.status || 'Active',
      logo_url: comp.logo_url || '',
      primary_color: comp.primary_color || '#0078d4',
      powered_by_text: comp.powered_by_text || 'Powered by Egotech',
      custom_tagline: comp.custom_tagline || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      setSavingEdit(true);
      setEditMsg('');
      await api.updateCompany(editingCompany.id, editForm);
      setEditMsg('Client details and branding updated successfully!');
      fetchClientData();
      setTimeout(() => {
        setEditModalOpen(false);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update client.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateClientCompany = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const res = await api.createCompany(formData);
      setOnboardSuccess({
        company: res.company,
        admin: {
          name: formData.admin_name || `${formData.name} Administrator`,
          email: formData.admin_email,
          password: formData.admin_password,
        },
      });
      fetchClientData();
    } catch (err) {
      setError(err.message || 'Failed to onboard client company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!onboardSuccess) return;
    const text = `Egotech Administrator Login Credentials:
Organization: ${onboardSuccess.company.name}
Portal URL: http://localhost:3000/login
Admin Email: ${onboardSuccess.admin.email}
Initial Password: ${onboardSuccess.admin.password}
Co-Branding: ${formData.powered_by_text || 'Powered by Egotech'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.admin_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-300">
              <Crown className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Client Organizations & Co-Branding Hub</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Onboard clients, customize their logo & "Powered By" white-label branding, and manage subscriptions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setOnboardSuccess(null);
            setOnboardModalOpen(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 flex items-center space-x-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Onboard New Client Company</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards for Platform Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Client Companies</p>
          <h4 className="mt-1.5 text-2xl font-bold text-slate-800">{stats?.total_companies || companies.length}</h4>
          <p className="mt-1 text-xs text-emerald-600 font-medium">{stats?.active_clients || 0} Active Subscriptions</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Workforce Managed</p>
          <h4 className="mt-1.5 text-2xl font-bold text-slate-800">{stats?.total_employees || 0} Staff</h4>
          <p className="mt-1 text-xs text-slate-500">Across all tenant clients</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total User Logins</p>
          <h4 className="mt-1.5 text-2xl font-bold text-slate-800">{stats?.total_users || 0}</h4>
          <p className="mt-1 text-xs text-indigo-600 font-medium">Admins, HR & Employees</p>
        </div>

        <div className="p-5 bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">White-Label Service</p>
          <h4 className="mt-1.5 text-xl font-bold text-amber-950">Co-Branded Multi-Tenant</h4>
          <p className="mt-1 text-xs text-amber-700 font-medium">Client Logo + Powered By Badge</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company name, code, or administrator email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">{filteredCompanies.length} Organizations</span>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Organization & Logo</th>
                <th className="py-3 px-4">Co-Branding Badge</th>
                <th className="py-3 px-4">Org Code</th>
                <th className="py-3 px-4">Administrator Account</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4 text-center">Headcount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading client organizations...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">No Client Companies Active</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          You have a clean tenant state with zero clients. Click below to onboard your first client organization.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setError('');
                          setOnboardSuccess(null);
                          setOnboardModalOpen(true);
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                      >
                        + Onboard Client Company
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        {c.logo_url ? (
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                            <img src={c.logo_url} alt={c.name} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: c.primary_color || '#4f46e5' }}
                          >
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
                            <span>{c.name}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{c.email || c.phone || 'No direct phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.primary_color || '#0078d4' }} />
                        <span className="text-[11px] font-semibold text-slate-700">
                          {c.powered_by_text || 'Powered by Egotech'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {c.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{c.admin_name || 'Primary Admin'}</p>
                      <p className="text-[10px] font-mono text-indigo-600">{c.admin_email || 'No admin assigned'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={c.plan} />
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {c.employee_count || 0} Staff
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ml-auto cursor-pointer border border-slate-200"
                        title="Customize client logo, primary brand color, and 'Powered By' co-branding"
                      >
                        <Palette className="w-3.5 h-3.5 text-amber-600" />
                        <span>Co-Brand</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Client Modal */}
      <Modal
        isOpen={onboardModalOpen}
        onClose={() => setOnboardModalOpen(false)}
        title="Onboard New Client Organization with Co-Branding"
        maxWidth="max-w-2xl"
      >
        {onboardSuccess ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-800">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-900">Organization & Co-Branding Provisioned!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  <strong>{onboardSuccess.company.name}</strong> is now live on the platform with custom branding, an isolated workspace, default shifts, and leave quotas.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Client Administrator Login Credentials
                </span>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Administrator Email</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{onboardSuccess.admin.email}</p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Initial Password</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{onboardSuccess.admin.password}</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Send these credentials to the client. They can log in immediately at <code>http://localhost:3000/login</code> and see their customized logo and "Powered By" co-branding!
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOnboardModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateClientCompany} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Company Profile */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                1. Client Company Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Microsoft Corporation"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company Code (Optional)</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. MSFT"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subscription Plan</label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  >
                    <option value="Enterprise">Enterprise Tier ($299/mo)</option>
                    <option value="Professional">Professional Tier ($149/mo)</option>
                    <option value="Starter">Starter Tier ($49/mo)</option>
                    <option value="Trial">14-Day Free Trial</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600">Operating Currency</label>
                    <span className="text-[10px] text-indigo-600 font-bold">{formData.currency_code} ({formData.currency_symbol})</span>
                  </div>
                  <select
                    value={formData.currency_code}
                    onChange={(e) => {
                      const sel = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                      if (sel) {
                        setFormData((prev) => ({ ...prev, currency_code: sel.code, currency_symbol: sel.symbol }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency quick buttons */}
              <div className="mt-2.5 flex items-center space-x-1.5 flex-wrap gap-y-1">
                <span className="text-[10px] text-slate-400">Popular Currencies:</span>
                {[
                  { code: 'USD', symbol: '$' },
                  { code: 'INR', symbol: '₹' },
                  { code: 'EUR', symbol: '€' },
                  { code: 'GBP', symbol: '£' },
                  { code: 'AED', symbol: 'د.إ' },
                ].map((q) => (
                  <button
                    key={q.code}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, currency_code: q.code, currency_symbol: q.symbol }))}
                    className={`px-2 py-0.5 text-[10px] rounded font-semibold transition cursor-pointer ${
                      formData.currency_code === q.code
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {q.code} ({q.symbol})
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: White-Label Co-Branding */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Client White-Label Co-Branding</span>
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Configure client's custom logo and the "Powered by" co-branding badge that will appear across their portal and payslips.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600">Client Logo URL</label>
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400">Quick Presets:</span>
                      {LOGO_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, logo_url: p.url, primary_color: p.color }))}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Brand Primary Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        name="primary_color"
                        value={formData.primary_color}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                    {/* Color Presets */}
                    <div className="flex items-center space-x-1.5 mt-1.5">
                      {COLOR_PRESETS.slice(0, 5).map((cp) => (
                        <button
                          key={cp.hex}
                          type="button"
                          title={cp.name}
                          onClick={() => setFormData((prev) => ({ ...prev, primary_color: cp.hex }))}
                          className="w-4 h-4 rounded-full border border-slate-300 transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: cp.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">"Powered By" Co-Branding Text</label>
                    <input
                      type="text"
                      name="powered_by_text"
                      value={formData.powered_by_text}
                      onChange={handleInputChange}
                      placeholder="e.g. Powered by Egotech"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3 bg-slate-900 rounded-xl text-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Live Portal Header Preview
                  </span>
                  <div className="mt-2 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {formData.logo_url ? (
                        <div className="w-8 h-8 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                          <img src={formData.logo_url} alt="Client Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: formData.primary_color || '#0078d4' }}
                        >
                          {(formData.name || 'Client').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">
                          {formData.name || 'Client Organization Legal Name'}
                        </p>
                        <p className="text-[10px] text-amber-400 font-medium">
                          {formData.powered_by_text || 'Powered by Egotech'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                      Co-Branded Portal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Primary Administrator Account */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Create Client Administrator Account</span>
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                This account will be given to the client's company owner/admin to manage their HRMS workspace.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Administrator Full Name</label>
                  <input
                    type="text"
                    name="admin_name"
                    value={formData.admin_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Satya Nadella"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Administrator Work Email *</label>
                  <input
                    type="email"
                    name="admin_email"
                    value={formData.admin_email}
                    onChange={handleInputChange}
                    placeholder="admin@microsoft.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOnboardModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Provisioning...' : 'Provision Client & Co-Branding'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit / Co-Brand Client Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Customize Co-Branding: ${editingCompany?.name || ''}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 py-1">
          {editMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{editMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Company Legal Name</label>
            <input
              type="text"
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600">Client Logo URL</label>
              <div className="flex items-center space-x-1">
                {LOGO_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, logo_url: p.url, primary_color: p.color }))}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="url"
              name="logo_url"
              value={editForm.logo_url}
              onChange={handleEditChange}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand Primary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="primary_color"
                  value={editForm.primary_color}
                  onChange={handleEditChange}
                  className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  name="primary_color"
                  value={editForm.primary_color}
                  onChange={handleEditChange}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">"Powered By" Co-Branding Text</label>
              <input
                type="text"
                name="powered_by_text"
                value={editForm.powered_by_text}
                onChange={handleEditChange}
                placeholder="e.g. Powered by Egotech"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Client Tagline</label>
            <input
              type="text"
              name="custom_tagline"
              value={editForm.custom_tagline}
              onChange={handleEditChange}
              placeholder="e.g. Empowering every person on the planet"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          {/* Operating Currency Dropdown in Edit Modal */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                <span>Client Operating Currency</span>
              </label>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                {editForm.currency_code} ({editForm.currency_symbol})
              </span>
            </div>

            <select
              value={CURRENCY_OPTIONS.some((c) => c.code === editForm.currency_code) ? editForm.currency_code : 'CUSTOM'}
              onChange={(e) => {
                const sel = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                if (sel) {
                  setEditForm((prev) => ({ ...prev, currency_code: sel.code, currency_symbol: sel.symbol }));
                }
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {['USD', 'INR', 'EUR', 'GBP', 'AED'].map((curCode) => {
                const opt = CURRENCY_OPTIONS.find((o) => o.code === curCode);
                return (
                  <button
                    key={curCode}
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, currency_code: opt.code, currency_symbol: opt.symbol }))}
                    className={`px-2 py-0.5 text-[10px] rounded font-semibold cursor-pointer ${
                      editForm.currency_code === curCode ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {curCode} ({opt.symbol})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3 bg-slate-900 rounded-xl text-white">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Updated Header Preview
            </span>
            <div className="mt-2 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {editForm.logo_url ? (
                  <div className="w-8 h-8 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                    <img src={editForm.logo_url} alt="Client Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: editForm.primary_color || '#0078d4' }}
                  >
                    {(editForm.name || 'Client').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    {editForm.name || 'Company Name'}
                  </p>
                  <p className="text-[10px] text-amber-400 font-medium">
                    {editForm.powered_by_text || 'Powered by Egotech'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                Co-Branded
              </span>
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingEdit ? 'Saving...' : 'Save Co-Branding'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
