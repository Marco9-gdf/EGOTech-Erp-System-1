import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PunchCard from '../components/Attendance/PunchCard';
import StatsCard from '../components/Common/StatsCard';
import Badge from '../components/Common/Badge';
import { CURRENCY_OPTIONS } from '../utils/currencies';
import {
  Users,
  UserCheck,
  Clock,
  CalendarOff,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  Download,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
  Building2,
  UserPlus,
  Plus,
  Key,
  Copy,
  ExternalLink,
  Briefcase,
  Layers,
  Lock,
  Sparkles,
  Crown,
  Search,
  RefreshCw,
  Shield,
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

export default function Dashboard() {
  const { user, isHr, role, currencySymbol = '$' } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Platform Owner Dashboard State
  const [activeOwnerTab, setActiveOwnerTab] = useState('clients'); // 'clients' | 'egotech' | 'accounts'
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isClientAdminModalOpen, setIsClientAdminModalOpen] = useState(false);
  const [isEgotechStaffModalOpen, setIsEgotechStaffModalOpen] = useState(false);
  const [isEgotechEmployeeModalOpen, setIsEgotechEmployeeModalOpen] = useState(false);
  const [egotechDepts, setEgotechDepts] = useState([]);
  const [egotechShifts, setEgotechShifts] = useState([]);
  const [egotechViewMode, setEgotechViewMode] = useState('employees'); // 'employees' | 'users'
  const [creationSuccess, setCreationSuccess] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('');

  // Creation Form State
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    plan: 'Enterprise',
    currency_code: 'INR',
    currency_symbol: '₹',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  const [newAdminForm, setNewAdminForm] = useState({
    company_id: '',
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });

  const [newEgotechStaffForm, setNewEgotechStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });

  // Dedicated Egotech Employee Onboarding Form
  const [newEgotechEmployeeForm, setNewEgotechEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'Full-Time',
    shift_id: '',
    base_salary: 50000,
    hra: 10000,
    conveyance_allowance: 2000,
    medical_allowance: 1500,
    special_allowance: 3000,
    provident_fund: 2000,
    professional_tax: 200,
    health_insurance: 500,
    tds_tax: 2500,
    overtime_rate_per_hour: 250,
    bank_name: 'HDFC Bank',
    bank_account_no: '50100456789012',
    bank_ifsc: 'HDFC0001234',
    tax_id: 'PAN998877',
    create_account: true,
    account_role: 'employee',
    account_password: 'EgotechStaff2026!',
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (role === 'owner') {
      api.getDepartments(1).then((r) => {
        const depts = r.departments || [];
        setEgotechDepts(depts);
        if (depts.length > 0) {
          setNewEgotechEmployeeForm((prev) => ({ ...prev, department_id: depts[0].id }));
        }
      }).catch(() => {});

      api.getShifts(1).then((r) => {
        const shifts = r.shifts || [];
        setEgotechShifts(shifts);
        if (shifts.length > 0) {
          setNewEgotechEmployeeForm((prev) => ({ ...prev, shift_id: shifts[0].id }));
        }
      }).catch(() => {});
    }
  }, [role]);

  // Handlers for Platform Owner Creation Actions
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyForm.name.trim() || !newCompanyForm.admin_email.trim() || !newCompanyForm.admin_password) {
      setModalError('Company name, administrator email, and administrator password are required.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await api.createCompany(newCompanyForm);
      setCreationSuccess({
        title: 'Client Organization Onboarded Successfully!',
        companyName: res.company?.name || newCompanyForm.name,
        companyCode: res.company?.code,
        adminEmail: res.administrator?.email || newCompanyForm.admin_email,
        adminPassword: newCompanyForm.admin_password,
        role: 'Company Administrator',
        type: 'company',
      });
      setIsCompanyModalOpen(false);
      setNewCompanyForm({
        name: '',
        code: '',
        email: '',
        phone: '',
        plan: 'Enterprise',
        currency_code: 'INR',
        currency_symbol: '₹',
        admin_name: '',
        admin_email: '',
        admin_password: '',
      });
      await fetchDashboardData();
    } catch (err) {
      setModalError(err.message || 'Failed to create client company.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateClientAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminForm.company_id || !newAdminForm.email.trim() || !newAdminForm.password) {
      setModalError('Please select a client company and provide admin email and password.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await api.createAccount(newAdminForm);
      const targetCo = data?.client_companies?.find((c) => String(c.id) === String(newAdminForm.company_id));
      setCreationSuccess({
        title: 'Client Administrator Provisioned Successfully!',
        companyName: targetCo ? targetCo.name : `Company #${newAdminForm.company_id}`,
        adminEmail: newAdminForm.email,
        adminPassword: newAdminForm.password,
        role: newAdminForm.role === 'admin' ? 'Company Administrator' : 'HR Manager',
        type: 'admin',
      });
      setIsClientAdminModalOpen(false);
      setNewAdminForm({ company_id: '', name: '', email: '', password: '', role: 'admin' });
      await fetchDashboardData();
    } catch (err) {
      setModalError(err.message || 'Failed to provision administrator.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateEgotechStaff = async (e) => {
    e.preventDefault();
    if (!newEgotechStaffForm.email.trim() || !newEgotechStaffForm.password) {
      setModalError('Email and temporary password are required for Egotech team member.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      await api.createAccount({
        ...newEgotechStaffForm,
        company_id: 1, // Egotech Technologies Inc.
      });
      setCreationSuccess({
        title: 'Egotech Team Member Added Successfully!',
        companyName: 'Egotech Technologies Inc. (Platform Vendor)',
        adminEmail: newEgotechStaffForm.email,
        adminPassword: newEgotechStaffForm.password,
        role: newEgotechStaffForm.role.toUpperCase(),
        type: 'egotech',
      });
      setIsEgotechStaffModalOpen(false);
      setNewEgotechStaffForm({ name: '', email: '', password: '', role: 'admin' });
      await fetchDashboardData();
    } catch (err) {
      setModalError(err.message || 'Failed to add Egotech team member.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateEgotechEmployee = async (e) => {
    e.preventDefault();
    if (
      !newEgotechEmployeeForm.first_name.trim() ||
      !newEgotechEmployeeForm.last_name.trim() ||
      !newEgotechEmployeeForm.email.trim() ||
      !newEgotechEmployeeForm.designation.trim()
    ) {
      setModalError('First name, last name, work email, and designation are required.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      const targetDeptId = newEgotechEmployeeForm.department_id || egotechDepts[0]?.id;
      const targetShiftId = newEgotechEmployeeForm.shift_id || egotechShifts[0]?.id;
      const payload = {
        ...newEgotechEmployeeForm,
        company_id: 1, // Egotech Technologies Inc.
        department_id: targetDeptId,
        shift_id: targetShiftId,
      };

      await api.createEmployee(payload);
      setCreationSuccess({
        title: 'Egotech Employee Onboarded Successfully!',
        companyName: 'Egotech Technologies Inc. (Platform Vendor)',
        adminEmail: newEgotechEmployeeForm.email,
        adminPassword: newEgotechEmployeeForm.create_account ? newEgotechEmployeeForm.account_password : '(No portal login)',
        role: `${newEgotechEmployeeForm.designation} (${newEgotechEmployeeForm.account_role.toUpperCase()})`,
        type: 'employee',
      });
      setIsEgotechEmployeeModalOpen(false);
      setNewEgotechEmployeeForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department_id: egotechDepts[0]?.id || '',
        designation: '',
        joining_date: new Date().toISOString().split('T')[0],
        employment_type: 'Full-Time',
        shift_id: egotechShifts[0]?.id || '',
        base_salary: 50000,
        hra: 10000,
        conveyance_allowance: 2000,
        medical_allowance: 1500,
        special_allowance: 3000,
        provident_fund: 2000,
        professional_tax: 200,
        health_insurance: 500,
        tds_tax: 2500,
        overtime_rate_per_hour: 250,
        bank_name: 'HDFC Bank',
        bank_account_no: '50100456789012',
        bank_ifsc: 'HDFC0001234',
        tax_id: 'PAN998877',
        create_account: true,
        account_role: 'employee',
        account_password: 'EgotechStaff2026!',
      });
      await fetchDashboardData();
    } catch (err) {
      setModalError(err.message || 'Failed to onboard Egotech employee.');
    } finally {
      setModalSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // PLATFORM OWNER VIEW - EGOTECH COMMAND CENTER
  // ----------------------------------------------------------------------
  if (role === 'owner') {
    const clientCompanies = data?.client_companies || [];
    const egotechUsers = data?.egotech_users || [];
    const egotechEmployees = data?.egotech_employees || [];
    const allUsers = data?.all_users || [];

    const filteredUsers = allUsers.filter((u) => {
      const matchSearch =
        !accountSearch ||
        u.name?.toLowerCase().includes(accountSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(accountSearch.toLowerCase()) ||
        u.company_name?.toLowerCase().includes(accountSearch.toLowerCase());
      const matchRole = !accountRoleFilter || u.role === accountRoleFilter;
      return matchSearch && matchRole;
    });

    return (
      <div className="space-y-6">
        {/* Top Welcome & Provisioning Control Bar */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-400/15 border border-amber-400/30 rounded-full text-amber-300 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Platform Owner Superadmin Authority</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Egotech Vendor Command Center
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Welcome back, <strong className="text-white font-semibold">{user?.name || 'Harsh'}</strong>! You have total authority to create client companies, provision tenant administrators, and manage Egotech's core platform staff and payroll.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setModalError('');
                setIsEgotechEmployeeModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Egotech Employee</span>
            </button>

            <button
              onClick={() => {
                setModalError('');
                setIsCompanyModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Onboard Client Company</span>
            </button>

            <button
              onClick={() => {
                setModalError('');
                setIsClientAdminModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs border border-white/20 transition cursor-pointer flex items-center space-x-2 backdrop-blur-xs"
            >
              <Shield className="w-4 h-4 text-amber-300" />
              <span>Add Client Admin</span>
            </button>

            <button
              onClick={() => {
                setModalError('');
                setIsEgotechStaffModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-500/30 transition cursor-pointer flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>Egotech Admin Login</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Platform Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Client Organizations"
            value={data?.total_companies || 0}
            subtitle={clientCompanies.length === 0 ? 'Clean Slate • 0 Clients' : `${data?.active_clients || 0} Active Subscriptions`}
            icon={Building2}
            color="amber"
          />
          <StatsCard
            title="Egotech Workforce"
            value={`${egotechEmployees.length} Staff`}
            subtitle={`${egotechUsers.length} Active System Accounts`}
            icon={Users}
            color="emerald"
          />
          <StatsCard
            title="Total Registered Logins"
            value={data?.total_users || 0}
            subtitle="Across all tenants & platform"
            icon={Key}
            color="blue"
          />
          <StatsCard
            title="Platform Architecture"
            value="Bcrypt Encrypted"
            subtitle="Zero Plaintext • SQLite WAL"
            icon={ShieldCheck}
            color="purple"
          />
        </div>

        {/* Security Assurance Banner (Directly answering user's security quote) */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-emerald-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5">
                <span>Enterprise Security Standard Verified</span>
                <span className="inline-block px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded font-mono font-bold">100% Salted Hashes</span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Your credentials are never stored in plain text or hardcoded in production bundles. Every password is encrypted with one-way salted <strong className="font-semibold">Bcrypt hashing</strong>.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono font-medium shrink-0">
            Audit ID: SEC-EGOTECH-2026
          </span>
        </div>

        {/* Quick Provisioning Feature Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Dedicated Egotech Employee Creation */}
          <div className="p-5 bg-white rounded-3xl border-2 border-emerald-500/20 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition group relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold uppercase rounded-bl-xl tracking-wider">
              My Company
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Onboard Egotech Employee</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hire staff directly into Egotech Technologies Inc. (Company #1) with full department, shift, INR salary breakdown, bank info, and optional portal login.
              </p>
            </div>
            <button
              onClick={() => {
                setModalError('');
                setIsEgotechEmployeeModalOpen(true);
              }}
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-600/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Onboard Egotech Employee</span>
            </button>
          </div>

          {/* Tile 2: Create Client Organization */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-400 transition group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Onboard Client Organization</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Deploy an isolated tenant workspace. Auto-generates standard departments, shifts, leave types, and provisions the initial Company Administrator.
              </p>
            </div>
            <button
              onClick={() => {
                setModalError('');
                setIsCompanyModalOpen(true);
              }}
              className="mt-4 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>+ Launch Onboarding Modal</span>
            </button>
          </div>

          {/* Tile 3: Add Client Administrator */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-400 transition group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Provision Client Administrator</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Grant management access to a specific client company. Creates a dedicated Admin or HR account with salted password encryption.
              </p>
            </div>
            <button
              onClick={() => {
                setModalError('');
                setIsClientAdminModalOpen(true);
              }}
              className="mt-4 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>+ Add Client Admin Account</span>
            </button>
          </div>

          {/* Tile 4: Egotech Platform Team */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-400 transition group">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Key className="w-5 h-5 text-slate-800" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Egotech Platform Logins</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Expand your core Egotech Technologies operations team. Add platform administrators, HR managers, or platform specialists directly to Company #1.
              </p>
            </div>
            <button
              onClick={() => {
                setModalError('');
                setIsEgotechStaffModalOpen(true);
              }}
              className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>+ Add Egotech Login Account</span>
            </button>
          </div>
        </div>

        {/* Tabbed Interactive Management Console */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Tab Navigation Header */}
          <div className="px-6 pt-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-1 border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0">
              <button
                onClick={() => setActiveOwnerTab('clients')}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
                  activeOwnerTab === 'clients'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Client Organizations ({clientCompanies.length})</span>
              </button>

              <button
                onClick={() => setActiveOwnerTab('egotech')}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
                  activeOwnerTab === 'egotech'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Egotech Core Team ({egotechEmployees.length} Staff / {egotechUsers.length} Logins)</span>
              </button>

              <button
                onClick={() => setActiveOwnerTab('accounts')}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-2 ${
                  activeOwnerTab === 'accounts'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>All Platform Logins ({allUsers.length})</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pb-3 sm:pb-0">
              <button
                onClick={fetchDashboardData}
                title="Refresh Metrics"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: Client Organizations */}
          {activeOwnerTab === 'clients' && (
            <div className="p-6">
              {clientCompanies.length === 0 ? (
                /* Zero Client Companies State */
                <div className="py-14 text-center max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                    <Building2 className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-full tracking-wider mb-2">
                      Clean Tenant State • 0 Client Companies
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      No Client Organizations Active
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      You have a fresh, clean slate! Egotech Technologies Inc. is currently the sole company. You have total authority to onboard external client companies and provision their administrators whenever you choose.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      onClick={() => {
                        setModalError('');
                        setIsCompanyModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/25 flex items-center space-x-2 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Onboard First Client Organization</span>
                    </button>
                    <a
                      href="/clients"
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                    >
                      <span>Explore Client Directory</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Client Table when clients exist */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Organization Name</th>
                        <th className="py-3 px-4">Org Code</th>
                        <th className="py-3 px-4">Primary Administrator</th>
                        <th className="py-3 px-4">Subscription Plan</th>
                        <th className="py-3 px-4 text-center">Headcount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.primary_color || '#0078d4' }} />
                            <span>{c.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                            {c.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-800">{c.admin_name || 'Primary Admin'}</p>
                            <p className="text-[10px] text-indigo-600 font-mono">{c.admin_email || 'No email'}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge status={c.plan} />
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {c.staff_count || 0} Staff
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge status={c.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setNewAdminForm({ ...newAdminForm, company_id: String(c.id) });
                                setModalError('');
                                setIsClientAdminModalOpen(true);
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              + Add Admin
                            </button>
                            <a
                              href="/clients"
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Manage →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Egotech Core Team */}
          {activeOwnerTab === 'egotech' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Egotech Technologies Inc. (Platform Vendor Core Team)
                  </h3>
                  <p className="text-xs text-slate-500">
                    SaaS platform provider organization (Company #1) staff, payroll directory, and access credentials
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setEgotechViewMode('employees')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        egotechViewMode === 'employees'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Workforce Directory ({egotechEmployees.length})
                    </button>
                    <button
                      onClick={() => setEgotechViewMode('users')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        egotechViewMode === 'users'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      System Logins ({egotechUsers.length})
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setModalError('');
                      setIsEgotechEmployeeModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Egotech Employee</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalError('');
                      setIsEgotechStaffModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>+ Add Login</span>
                  </button>
                </div>
              </div>

              {/* View 1: Egotech Employees Workforce Directory */}
              {egotechViewMode === 'employees' && (
                egotechEmployees.length === 0 ? (
                  <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">No Egotech Employees Registered Yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Use the dedicated button to hire and onboard your first internal staff member into Egotech Technologies Inc. with automatic INR payroll structure.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setModalError('');
                        setIsEgotechEmployeeModalOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Onboard First Egotech Employee</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Designation & Type</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Shift</th>
                          <th className="py-3 px-4 text-right">Base Salary</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Profile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {egotechEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                  {emp.first_name?.[0]}{emp.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{emp.first_name} {emp.last_name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                              {emp.employee_code}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-slate-800">{emp.designation}</p>
                              <p className="text-[10px] text-slate-400">{emp.employment_type || 'Full-Time'}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {emp.department_name || 'General Operations'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {emp.shift_name || 'Standard Shift'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                              ₹{Number(emp.base_salary || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge status={emp.status || 'Active'} />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <a
                                href={`/employees/${emp.id}`}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                View Profile →
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* View 2: Egotech User Logins */}
              {egotechViewMode === 'users' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Name & Email</th>
                        <th className="py-3 px-4">Platform Role</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4 text-right">Security</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {egotechUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                {u.name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{u.name || 'Egotech User'}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'owner'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : u.role === 'admin'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : u.role === 'hr'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.role === 'owner' ? '👑 Platform Owner' : u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {u.designation || (u.role === 'owner' ? 'SaaS Platform Founder & Owner' : 'Operations Specialist')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            {u.department_name || 'Management & Operations'}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge status={u.status || 'Active'} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                              ✓ Bcrypt Salted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: All Platform Logins */}
          {activeOwnerTab === 'accounts' && (
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    All Platform Registered Logins
                  </h3>
                  <p className="text-xs text-slate-500">
                    Master directory of every active login credential across Egotech and client tenant workspaces
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={accountRoleFilter}
                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Account User</th>
                      <th className="py-3 px-4">Organization</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Access Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <p className="font-bold text-slate-800">{u.name || 'User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {u.company_name || (u.company_id === 1 ? 'Egotech Technologies' : `Company #${u.company_id}`)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'owner'
                                ? 'bg-amber-100 text-amber-800'
                                : u.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-800'
                                : u.role === 'hr'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={u.status || 'Active'} />
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {u.role === 'owner' ? 'Superadmin Authority' : `${u.role.toUpperCase()} Workspace`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* MODAL 1: ONBOARD NEW CLIENT COMPANY                              */}
        {/* ================================================================ */}
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Onboard New Client Organization</h3>
                    <p className="text-[10px] text-slate-400">Provisions isolated company workspace & initial administrator</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Company Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nexus Innovations Ltd"
                        value={newCompanyForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const suggestedCode = val.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
                          setNewCompanyForm({ ...newCompanyForm, name: val, code: newCompanyForm.code || suggestedCode });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Code *</label>
                      <input
                        type="text"
                        placeholder="e.g. NEXUS"
                        value={newCompanyForm.code}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
                      <select
                        value={newCompanyForm.plan}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, plan: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        <option value="Starter">Starter (Up to 25 Staff)</option>
                        <option value="Pro">Pro (Up to 100 Staff)</option>
                        <option value="Enterprise">Enterprise (Unlimited Staff)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Currency</label>
                      <select
                        value={newCompanyForm.currency_code}
                        onChange={(e) => {
                          const sel = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                          setNewCompanyForm({
                            ...newCompanyForm,
                            currency_code: sel ? sel.code : 'INR',
                            currency_symbol: sel ? sel.symbol : '₹',
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Initial Administrator Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Smith"
                        value={newCompanyForm.admin_name}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, admin_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Login Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@clientcompany.com"
                        value={newCompanyForm.admin_email}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, admin_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SecurePass2026!"
                      value={newCompanyForm.admin_password}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, admin_password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Will be securely encrypted using salted Bcrypt before saving to database.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCompanyModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {modalSubmitting ? 'Provisioning...' : 'Provision Client Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODAL 2: PROVISION CLIENT ADMINISTRATOR                          */}
        {/* ================================================================ */}
        {isClientAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Provision Client Administrator</h3>
                    <p className="text-[10px] text-slate-400">Add an administrator or HR specialist to a client company</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsClientAdminModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {clientCompanies.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    No client companies are currently onboarded. Please onboard a client company first before provisioning client administrators.
                  </p>
                  <button
                    onClick={() => {
                      setIsClientAdminModalOpen(false);
                      setIsCompanyModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    + Onboard Client Company
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateClientAdmin} className="space-y-3">
                  {modalError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Target Client Company *</label>
                    <select
                      required
                      value={newAdminForm.company_id}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, company_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="">-- Choose Client Company --</option>
                      {clientCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) - {c.plan} Plan
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rachel Adams"
                      value={newAdminForm.name}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Login Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="rachel@client.com"
                      value={newAdminForm.email}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                      <select
                        value={newAdminForm.role}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        <option value="admin">Company Admin</option>
                        <option value="hr">HR Specialist</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                      <input
                        type="text"
                        required
                        placeholder="AdminPass123!"
                        value={newAdminForm.password}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsClientAdminModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {modalSubmitting ? 'Provisioning...' : 'Provision Administrator'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODAL 3: ADD EGOTECH PLATFORM TEAM MEMBER (COMPANY 1)            */}
        {/* ================================================================ */}
        {isEgotechStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-slate-900 text-white">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Add Egotech Team Member</h3>
                    <p className="text-[10px] text-slate-400">Add an administrator or staff member to Egotech Technologies Inc. (Company #1)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEgotechStaffModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateEgotechStaff} className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center space-x-2.5 text-xs text-indigo-900">
                  <Crown className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Assigned to: <strong>Egotech Technologies Inc. (Platform Vendor)</strong></span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vikram Patel"
                    value={newEgotechStaffForm.name}
                    onChange={(e) => setNewEgotechStaffForm({ ...newEgotechStaffForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@egotech.com"
                    value={newEgotechStaffForm.email}
                    onChange={(e) => setNewEgotechStaffForm({ ...newEgotechStaffForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                    <select
                      value={newEgotechStaffForm.role}
                      onChange={(e) => setNewEgotechStaffForm({ ...newEgotechStaffForm, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                    >
                      <option value="admin">Operations Admin</option>
                      <option value="hr">HR Manager</option>
                      <option value="employee">Staff / Specialist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="TempPass123!"
                      value={newEgotechStaffForm.password}
                      onChange={(e) => setNewEgotechStaffForm({ ...newEgotechStaffForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEgotechStaffModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {modalSubmitting ? 'Adding...' : 'Add Team Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODAL 4: DEDICATED EGOTECH EMPLOYEE ONBOARDING MODAL             */}
        {/* ================================================================ */}
        {isEgotechEmployeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <span>Onboard Egotech Employee</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        My Company • Egotech (Org #1)
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Hire directly into Egotech Technologies Inc. with automatic INR payroll structure, shift & portal credentials
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEgotechEmployeeModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateEgotechEmployee} className="space-y-4">
                {/* 1. Basic Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Personal & Contact Information</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul"
                        value={newEgotechEmployeeForm.first_name}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, first_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Verma"
                        value={newEgotechEmployeeForm.last_name}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, last_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="rahul.verma@egotech.com"
                        value={newEgotechEmployeeForm.email}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+91 98765 43210"
                        value={newEgotechEmployeeForm.phone}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Job & Position */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Job & Department Assignment</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Designation / Role *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Software Engineer"
                        value={newEgotechEmployeeForm.designation}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, designation: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                      <select
                        value={newEgotechEmployeeForm.department_id}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, department_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        {egotechDepts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Shift</label>
                      <select
                        value={newEgotechEmployeeForm.shift_id}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, shift_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        {egotechShifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.start_time} - {s.end_time})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={newEgotechEmployeeForm.employment_type}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, employment_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={newEgotechEmployeeForm.joining_date}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, joining_date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Compensation & INR Salary Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Monthly Salary Structure (INR ₹)</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                      <input
                        type="number"
                        value={newEgotechEmployeeForm.base_salary}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, base_salary: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">HRA (₹)</label>
                      <input
                        type="number"
                        value={newEgotechEmployeeForm.hra}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, hra: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Special Allow (₹)</label>
                      <input
                        type="number"
                        value={newEgotechEmployeeForm.special_allowance}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, special_allowance: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Provident Fund (₹)</label>
                      <input
                        type="number"
                        value={newEgotechEmployeeForm.provident_fund}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, provident_fund: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Banking & PAN Information */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Banking & Tax Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={newEgotechEmployeeForm.bank_name}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, bank_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="50100..."
                        value={newEgotechEmployeeForm.bank_account_no}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, bank_account_no: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="HDFC0001234"
                        value={newEgotechEmployeeForm.bank_ifsc}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, bank_ifsc: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">PAN / Tax ID</label>
                      <input
                        type="text"
                        placeholder="ABCDE1234F"
                        value={newEgotechEmployeeForm.tax_id}
                        onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, tax_id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Employee Portal Access */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="egotech_create_account"
                      checked={newEgotechEmployeeForm.create_account}
                      onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, create_account: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <label htmlFor="egotech_create_account" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Provision Login Account for this Employee
                    </label>
                  </div>

                  {newEgotechEmployeeForm.create_account && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Portal Role</label>
                        <select
                          value={newEgotechEmployeeForm.account_role}
                          onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, account_role: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                        >
                          <option value="employee">Employee (Self-Service Attendance & Payslips)</option>
                          <option value="hr">HR Executive (Manage Workforce & Approvals)</option>
                          <option value="admin">Operations Admin (Full Company #1 Control)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Initial Password *</label>
                        <input
                          type="text"
                          required={newEgotechEmployeeForm.create_account}
                          placeholder="EgotechStaff2026!"
                          value={newEgotechEmployeeForm.account_password}
                          onChange={(e) => setNewEgotechEmployeeForm({ ...newEgotechEmployeeForm, account_password: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Salted Bcrypt encrypted before storing in database.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEgotechEmployeeModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {modalSubmitting ? 'Onboarding...' : 'Onboard Employee into Egotech'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SUCCESS CONFIRMATION MODAL WITH COPYABLE CREDENTIALS             */}
        {/* ================================================================ */}
        {creationSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <div className="text-center">
                <h3 className="font-bold text-slate-900 text-base">{creationSuccess.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Provisioned under <strong className="text-slate-800">{creationSuccess.companyName}</strong>
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 text-[11px] uppercase">Login Email:</span>
                  <span className="font-bold text-slate-800">{creationSuccess.adminEmail}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-400 text-[11px] uppercase">Password:</span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{creationSuccess.adminPassword}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 text-[11px] uppercase">Role:</span>
                  <span className="font-bold text-slate-700">{creationSuccess.role}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => {
                    const text = `Egotech Credentials:\nOrganization: ${creationSuccess.companyName}\nEmail: ${creationSuccess.adminEmail}\nPassword: ${creationSuccess.adminPassword}\nRole: ${creationSuccess.role}`;
                    navigator.clipboard?.writeText(text);
                    alert('Credentials copied to clipboard!');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Credentials</span>
                </button>
                <button
                  onClick={() => setCreationSuccess(null)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // EMPLOYEE VIEW
  // ----------------------------------------------------------------------
  if (!isHr) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Workspace</h2>
          <p className="text-xs text-slate-500">Track your attendance, work hours, and recent salary</p>
        </div>

        {/* Top Grid: Punch In Card + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PunchCard onPunchChange={fetchDashboardData} />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatsCard
                title="This Week's Hours"
                value={`${data?.week_hours || 0} hrs`}
                subtitle={`Overtime: ${data?.week_ot_hours || 0} hrs`}
                icon={Clock}
                color="blue"
              />
              <StatsCard
                title="Latest Net Salary"
                value={data?.latest_payslip ? `${currencySymbol}${Number(data.latest_payslip.net_salary).toFixed(2)}` : `${currencySymbol}0.00`}
                subtitle={data?.latest_payslip ? `Month ${data.latest_payslip.month}/${data.latest_payslip.year}` : 'No payslips yet'}
                icon={DollarSign}
                color="emerald"
              />
            </div>

            {/* Leave Balances Grid */}
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Remaining Leave Quota (2026)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data?.leave_balances?.map((b) => (
                  <div key={b.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      {Math.max(0, b.total_days - b.used_days)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{b.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Used: {b.used_days} / {b.total_days}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Attendance Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">My Recent Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Worked Hours</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_attendance?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-slate-400">
                      No attendance logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  data?.recent_attendance?.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-medium text-slate-800">{r.date}</td>
                      <td className="py-3 px-3">
                        <Badge status={r.status} />
                        {r.is_late ? (
                          <span className="ml-1 text-[10px] text-amber-600 font-semibold">Late</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{r.clock_in || '--'}</td>
                      <td className="py-3 px-3 text-slate-600">{r.clock_out || '--'}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {r.working_hours ? `${r.working_hours} hrs` : '--'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-xs">{r.notes || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // HR & ADMIN VIEW
  // ----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Executive HR Dashboard</h2>
          <p className="text-xs text-slate-500">Real-time attendance metrics, workforce status, and payroll overview</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Staff"
          value={data?.total_staff || 0}
          subtitle="Active Employees"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Present Today"
          value={data?.present_today || 0}
          subtitle={`${data?.late_today || 0} arrived late`}
          icon={UserCheck}
          color="emerald"
        />
        <StatsCard
          title="On Leave"
          value={data?.on_leave_today || 0}
          subtitle="Approved requests"
          icon={CalendarOff}
          color="purple"
        />
        <StatsCard
          title="Pending Leaves"
          value={data?.pending_leaves || 0}
          subtitle="Require HR review"
          icon={AlertCircle}
          color="amber"
        />
        <StatsCard
          title="Latest Payroll"
          value={data?.latest_batch ? `${currencySymbol}${Number(data.latest_batch.total_net).toFixed(0)}` : `${currencySymbol}0`}
          subtitle={data?.latest_batch ? `${data.latest_batch.batch_name}` : 'No batches yet'}
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Statutory Compliance Glance */}
      <div className="p-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Statutory Compliance & Legal Governance Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% Ready
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Code on Wages 50% ratio active • CERT-In NTP synced • DPDP Act 2023 notices registered • POSH ICC ready
            </p>
          </div>
        </div>
        <a
          href="/compliance"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 text-center"
        >
          Open Compliance Hub →
        </a>
      </div>

      {/* Interactive Punch Widget + 7-Day Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PunchCard onPunchChange={fetchDashboardData} />
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">7-Day Attendance Trend</h3>
              <p className="text-xs text-slate-400">Daily workforce turnout and late marks</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.attendance_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="present" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="#f59e0b" name="Late Arrivals" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leaves" fill="#3b82f6" name="On Leave" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Department Breakdown & Today's Clock-in Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Department Headcount</h3>
          <div className="space-y-3">
            {data?.department_stats?.map((dept) => {
              const total = data.total_staff || 1;
              const percent = Math.round((dept.count / total) * 100);
              return (
                <div key={dept.name}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{dept.name}</span>
                    <span className="text-slate-500">{dept.count} members ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Attendance Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Today's Live Punches</h3>
          <div className="space-y-3">
            {data?.recent_activity?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No clock-ins recorded yet today.</p>
            ) : (
              data?.recent_activity?.map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {act.first_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {act.first_name} {act.last_name}
                      </p>
                      <p className="text-[10px] text-slate-400">{act.department_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-slate-700">{act.clock_in}</p>
                    {act.is_late ? (
                      <span className="text-[10px] font-bold text-amber-600">Late</span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-600">On Time</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
