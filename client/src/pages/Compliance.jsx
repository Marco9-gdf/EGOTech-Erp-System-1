import React, { useState, useEffect } from 'react';
import {
  Shield, Scale, AlertTriangle, FileText, CheckCircle2, Clock,
  Users, Lock, Download, RefreshCw, UserCheck, ShieldAlert,
  Coins, ArrowRight, Eye, Trash2, Send, Plus, Building2, ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/Common/Badge';
import Modal from '../components/Common/Modal';
import ConfirmModal from '../components/Common/ConfirmModal';

export default function Compliance() {
  const { user, isHr, isAdmin, isOwner } = useAuth();
  const toast = useToast();
  const isPrivileged = isHr || isAdmin || isOwner;
  const [activeTab, setActiveTab] = useState(isPrivileged ? 'labour_codes' : 'tax_tds');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [anonymizeEmployeeId, setAnonymizeEmployeeId] = useState(null);

  // Tab Data States
  const [labourAnalysis, setLabourAnalysis] = useState([]);
  const [consents, setConsents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [poshData, setPoshData] = useState({ complaints: [], icc_committee: null });
  const [taxDeclarations, setTaxDeclarations] = useState([]);
  const [gstInvoices, setGstInvoices] = useState([]);

  // Modals & Forms
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    incident_title: '',
    incident_type: 'Data Leak / Breach',
    severity: 'High',
    remediation_notes: '',
  });

  const [poshModalOpen, setPoshModalOpen] = useState(false);
  const [poshForm, setPoshForm] = useState({
    respondent_name: '',
    incident_date: new Date().toISOString().split('T')[0],
    description: '',
    is_confidential: true,
  });

  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);

  // Interactive Tax Calculator State
  const [calcGross, setCalcGross] = useState(85000);
  const [calc80c, setCalc80c] = useState(150000);
  const [calc80d, setCalc80d] = useState(25000);
  const [calcHra, setCalcHra] = useState(180000);
  const [taxComparison, setTaxComparison] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      const ov = await api.getComplianceOverview();
      setOverview(ov);
      const targetTab = isPrivileged ? activeTab : (activeTab === 'labour_codes' ? 'tax_tds' : activeTab);
      if (targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
      await loadTabData(targetTab);
    } catch (err) {
      setError(err.message || 'Failed to load statutory compliance data.');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    try {
      if (tab === 'labour_codes') {
        if (!isPrivileged) return;
        const res = await api.getLabourCodeAnalysis();
        setLabourAnalysis(res.analysis || []);
      } else if (tab === 'dpdp') {
        if (!isPrivileged) return;
        const res = await api.getDpdpConsents();
        setConsents(res.consents || []);
      } else if (tab === 'security') {
        if (!isPrivileged) return;
        const res = await api.getSecurityIncidents();
        setIncidents(res.incidents || []);
      } else if (tab === 'audit_logs') {
        if (!isPrivileged) return;
        const res = await api.getAuditLogs({ limit: 50 });
        setAuditLogs(res.logs || []);
      } else if (tab === 'posh') {
        const res = await api.getPoshComplaints();
        setPoshData(res);
      } else if (tab === 'tax_tds') {
        const res = await api.getTaxDeclarations();
        setTaxDeclarations(res.declarations || []);
        runTaxCalculator();
      } else if (tab === 'gst_contracts') {
        if (!isPrivileged) return;
        const res = await api.getSaasGstInvoices();
        setGstInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error('loadTabData error:', err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const runTaxCalculator = async () => {
    try {
      const res = await api.calculateTaxComparison({
        monthly_gross: Number(calcGross) || 0,
        sec_80c: Number(calc80c) || 0,
        sec_80d: Number(calc80d) || 0,
        hra_annual: Number(calcHra) || 0,
      });
      setTaxComparison(res);
    } catch (err) {
      console.error('runTaxCalculator error:', err);
    }
  };

  const handleRebalance = async (employeeId) => {
    try {
      setActionMsg('');
      const res = await api.rebalanceSalary(employeeId);
      toast.success(res.message, 'Labour Code 50% Rebalanced');
      setActionMsg(res.message);
      loadTabData('labour_codes');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      toast.error(err.message || 'Failed to rebalance salary.');
      setError(err.message || 'Failed to rebalance salary.');
    }
  };

  const handleAnonymize = (employeeId) => {
    setAnonymizeEmployeeId(employeeId);
  };

  const handleConfirmAnonymize = async () => {
    if (!anonymizeEmployeeId) return;
    try {
      setActionMsg('');
      const res = await api.anonymizeEmployee(anonymizeEmployeeId);
      toast.success(res.message, 'DPDP Right to Erasure Executed');
      setActionMsg(res.message);
      setAnonymizeEmployeeId(null);
      loadTabData('dpdp');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      toast.error(err.message || 'Failed to anonymize employee.');
      setError(err.message || 'Failed to anonymize employee.');
    }
  };

  const handleViewDossier = async (employeeId) => {
    try {
      const res = await api.getEmployeeDossier(employeeId);
      setSelectedDossier(res.dossier);
      setDossierModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve data dossier.');
      setError(err.message || 'Failed to retrieve data dossier.');
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      await api.createSecurityIncident(incidentForm);
      setIncidentModalOpen(false);
      setIncidentForm({ incident_title: '', incident_type: 'Data Leak / Breach', severity: 'High', remediation_notes: '' });
      toast.warning('Security incident filed. CERT-In 6-Hour and DPDP 72-Hour clocks started.', 'Security Alert');
      setActionMsg('Security incident filed. CERT-In 6-Hour and DPDP 72-Hour clocks started.');
      loadTabData('security');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      toast.error(err.message || 'Failed to file incident.');
      setError(err.message || 'Failed to file incident.');
    }
  };

  const handleDispatchCertIn = async (incidentId) => {
    try {
      await api.updateSecurityIncident(incidentId, { cert_in_status: 'Reported', status: 'Contained' });
      toast.info('Notice dispatched to CERT-In incident response portal.', 'CERT-In Dispatched');
      setActionMsg('Notice dispatched to CERT-In incident response portal.');
      loadTabData('security');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      toast.error(err.message || 'Failed to update CERT-In status.');
      setError(err.message || 'Failed to update CERT-In status.');
    }
  };

  const handleFilePosh = async (e) => {
    e.preventDefault();
    try {
      await api.filePoshComplaint(poshForm);
      setPoshModalOpen(false);
      setPoshForm({ respondent_name: '', incident_date: new Date().toISOString().split('T')[0], description: '', is_confidential: true });
      toast.success('POSH grievance submitted securely to the Internal Complaints Committee.', 'Grievance Registered');
      setActionMsg('POSH grievance submitted securely to the Internal Complaints Committee.');
      loadTabData('posh');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      toast.error(err.message || 'Failed to file POSH complaint.');
      setError(err.message || 'Failed to file POSH complaint.');
    }
  };

  const handleSignDpa = async () => {
    try {
      const res = await api.signDpaContract();
      toast.success(res.message, 'DPA Contract Executed');
      setActionMsg(res.message);
      fetchInitialData();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to sign DPA.');
    }
  };

  const exportAuditLogsCsv = () => {
    const headers = ['ID', 'Timestamp (IST)', 'User', 'Role', 'Action', 'Resource', 'Details', 'IP Address'];
    const rows = [headers.join(',')];
    auditLogs.forEach((l) => {
      rows.push([
        l.id,
        `"${l.timestamp}"`,
        `"${l.user_name || 'System'}"`,
        `"${l.user_role || 'system'}"`,
        `"${l.action}"`,
        `"${l.resource || ''}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${l.ip_address || '127.0.0.1'}"`,
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ICT_System_Audit_Logs_180Days_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const ALL_TABS = [
    { id: 'labour_codes', label: 'The Four Labour Codes', icon: Scale, badge: `${overview?.statutory?.labour_code_compliance_percent || 100}% Compliant`, privileged: true },
    { id: 'dpdp', label: 'DPDP Act & Privacy Hub', icon: Lock, badge: 'Rules 2025', privileged: true },
    { id: 'security', label: 'CERT-In & Incident Clocks', icon: ShieldAlert, badge: '6h / 72h', privileged: true },
    { id: 'audit_logs', label: '180-Day ICT Audit Trail', icon: FileText, badge: `${overview?.security?.audit_logs_count || 0} Logs`, privileged: true },
    { id: 'posh', label: 'POSH Act & ICC', icon: Users, badge: 'Section 21' },
    { id: 'tax_tds', label: 'TDS Sec 192 (Form 12BB)', icon: Coins, badge: 'New vs Old' },
    { id: 'gst_contracts', label: 'B2B GST & DPA Contracts', icon: Building2, badge: 'SAC 998314', privileged: true },
  ];

  const TABS = ALL_TABS.filter((t) => isPrivileged || !t.privileged);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                Statutory Compliance & Privacy Governance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Labour Codes 2025/2026 Ready
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center space-x-2.5">
              <span>Egotech Legal & Compliance Center</span>
            </h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Automated compliance engine enforcing the <strong>Four Labour Codes (50% uniform wage rule)</strong>,
              <strong> DPDP Act 2023</strong> notice & consent, <strong>CERT-In 6-hour incident reporting</strong>,
              <strong> Section 192 TDS dual regimes</strong>, and <strong>POSH Act Internal Complaints Committee</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => fetchInitialData()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <button
              onClick={() => setIncidentModalOpen(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Log Security Incident</span>
            </button>
          </div>
        </div>

        {/* Global Compliance KPI Row */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Labour Code 50% Rule</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {overview.statutory.labour_code_compliance_percent}%
              </p>
              <span className="text-[10px] text-slate-400">{overview.statutory.labour_code_compliant_count} of {overview.statutory.total_employees} staff</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">DPDP Act Consents</span>
              <p className="text-lg font-bold text-indigo-400 mt-0.5">
                {overview.privacy.dpdp_consent_rate}%
              </p>
              <span className="text-[10px] text-slate-400">Rules 2025 verified</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">CERT-In Incident Clock</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                {overview.security.cert_in_clock_hours} Hours
              </p>
              <span className="text-[10px] text-slate-400">Statutory limit</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">DPDP Breach Clock</span>
              <p className="text-lg font-bold text-sky-400 mt-0.5">
                {overview.security.dpdp_clock_hours} Hours
              </p>
              <span className="text-[10px] text-slate-400">DPBI notice clock</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">POSH Committee</span>
              <p className="text-lg font-bold text-purple-400 mt-0.5">
                Active
              </p>
              <span className="text-[10px] text-slate-400">{overview.posh.active_cases} open inquiry</span>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">180-Day ICT Logs</span>
              <p className="text-lg font-bold text-white mt-0.5">
                {overview.security.audit_logs_count} Entries
              </p>
              <span className="text-[10px] text-emerald-400">NTP IST Synced</span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {actionMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: THE FOUR LABOUR CODES (50% WAGE RULE) */}
      {activeTab === 'labour_codes' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-3">
            <Scale className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">The Code on Wages & Social Security 50% Rule</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                Under Section 2(y) of the Code on Wages, <strong>Basic Pay + Dearness Allowance (DA)</strong> must be at least
                <strong> 50% of the total monthly remuneration (Gross)</strong>. If allowances exceed 50%, the excess is automatically
                deemed wages for Employee Provident Fund (EPF), Gratuity, and Overtime computation.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Employee Remuneration & Wage Ratio Audit</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Evaluates each employee salary structure against statutory 50% threshold</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-100">
                {labourAnalysis.filter(a => a.is_compliant).length} of {labourAnalysis.length} Compliant
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Base Salary</th>
                    <th className="py-3 px-4">DA</th>
                    <th className="py-3 px-4">Total Allowances</th>
                    <th className="py-3 px-4">Total Gross</th>
                    <th className="py-3 px-4">Basic + DA Ratio</th>
                    <th className="py-3 px-4">Statutory Status</th>
                    <th className="py-3 px-4 text-right">Labour Code Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labourAnalysis.map((item) => (
                    <tr key={item.employee_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{item.employee_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.employee_code} • {item.designation}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">₹{Number(item.base_salary).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600">₹{Number(item.da).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600">₹{Number(item.allowances).toLocaleString()}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">₹{Number(item.total_gross).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`font-mono font-bold ${item.is_compliant ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.wage_ratio_percent}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full ${item.is_compliant ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, parseFloat(item.wage_ratio_percent))}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.is_compliant ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Compliant (&ge; 50%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Excess Allowances (₹{item.excess_allowances})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.is_compliant ? (
                          <span className="text-[11px] text-emerald-600 font-medium">✓ Verified</span>
                        ) : (
                          <button
                            onClick={() => handleRebalance(item.employee_id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                            title="Auto-adjust Special Allowance to meet 50% Basic wage mandate"
                          >
                            1-Click Rebalance
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DPDP ACT 2023 & PRIVACY HUB */}
      {activeTab === 'dpdp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">SaaS Regulatory Role</span>
              <p className="font-bold text-slate-800 text-sm mt-1">Data Processor (for Employees)</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Under the DPDP Act 2023, Egotech acts as a <strong>Data Processor</strong> on behalf of client Data Fiduciaries.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Aadhaar Protection</span>
              <p className="font-bold text-slate-800 text-sm mt-1">100% Masked (Last 4 Digits Only)</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Aadhaar numbers are strictly stored and rendered in masked format: <code>XXXX-XXXX-1234</code>.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Statutory Retention</span>
              <p className="font-bold text-slate-800 text-sm mt-1">8 Years Retention Schedule</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Payslips and statutory wage registers are retained for 8 years per Section 192 and Companies Act requirements.
              </p>
            </div>
          </div>

          {/* Consents & Rights Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Data Principal Notice & Consent Records</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Tracking purpose-bound consents and Data Principal Rights workflows</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg">
                Notice Version: v2.1 (DPDP 2025)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Data Principal</th>
                    <th className="py-3 px-4">Processing Purpose</th>
                    <th className="py-3 px-4">Consent Status</th>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4">Masked Aadhaar</th>
                    <th className="py-3 px-4 text-right">Data Principal Rights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consents.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{c.first_name} {c.last_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{c.employee_code} • {c.email}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{c.purpose}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'Granted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{c.consented_at}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.aadhaar_masked || 'XXXX-XXXX-8901'}</td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleViewDossier(c.employee_id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                          title="Right to Access: View/Export personal data dossier"
                        >
                          Access Dossier
                        </button>
                        <button
                          onClick={() => handleAnonymize(c.employee_id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                          title="Right to Erasure: Anonymize personal identifiers for ex-employees"
                        >
                          Right to Erasure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CERT-IN & SECURITY INCIDENT CLOCKS */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm">CERT-In 6-Hour & DPDP 72-Hour Breach Clocks</h3>
              </div>
              <p className="text-xs text-slate-300">
                The Indian Computer Emergency Response Team (CERT-In) requires reportable cybersecurity incidents to be
                notified within <strong>6 hours</strong> of detection. The DPDP Act requires Data Protection Board notice within <strong>72 hours</strong>.
              </p>
            </div>
            <button
              onClick={() => setIncidentModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              Log New Incident
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {incidents.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No Active Cybersecurity Incidents</p>
                <p className="text-xs text-slate-400 mt-0.5">Perimeter defenses and audit telemetry normal.</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        inc.severity === 'Critical' ? 'bg-rose-100 text-rose-800' : inc.severity === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {inc.severity} Severity
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{inc.incident_title}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">({inc.incident_type})</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* CERT-In 6-Hour Clock */}
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>CERT-In Clock: {inc.cert_in_status === 'Reported' ? 'Reported ✓' : `${inc.cert_in_remaining_minutes}m left`}</span>
                      </div>

                      {/* DPDP 72-Hour Clock */}
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>DPDP Clock: {inc.dpdp_status === 'Data Board Notified' ? 'Notified ✓' : `${inc.dpdp_remaining_hours}h left`}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {inc.remediation_notes}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>Detected: {inc.detected_at}</span>
                    <div className="flex items-center space-x-2">
                      {inc.cert_in_status !== 'Reported' && (
                        <button
                          onClick={() => handleDispatchCertIn(inc.id)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold transition cursor-pointer"
                        >
                          Dispatch CERT-In Notice
                        </button>
                      )}
                      <span className="font-semibold text-slate-600">Status: {inc.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: 180-DAY ICT AUDIT TRAIL */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">CERT-In 180-Day ICT System Audit Trail</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Indian timezone (IST) timestamps with user identification, action codes, IP address, and resource payload.
              </p>
            </div>
            <button
              onClick={exportAuditLogsCsv}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Logs (CSV)</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{log.user_name || 'System'}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{log.user_role}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{log.resource}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-md truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: POSH ACT & INTERNAL COMPLAINTS COMMITTEE */}
      {activeTab === 'posh' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Internal Complaints Committee (ICC) Directory</h3>
                  <p className="text-[11px] text-slate-500">Constituted in accordance with Section 4 of POSH Act 2013</p>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200">
                  Duly Constituted
                </span>
              </div>

              {poshData.icc_committee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-purple-700 font-bold uppercase">Presiding Officer</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{poshData.icc_committee.presiding_officer}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase">External NGO Representative</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{poshData.icc_committee.external_ngo_representative}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Internal Member (HR)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{poshData.icc_committee.internal_member_1}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Internal Member (Ops)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{poshData.icc_committee.internal_member_2}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-purple-900">Confidential Grievance Portal</h4>
                <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                  Employees can submit confidential grievances directly to the Presiding Officer and external member with anti-retaliation protections.
                </p>
              </div>
              <button
                onClick={() => setPoshModalOpen(true)}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs rounded-xl shadow cursor-pointer transition"
              >
                File Confidential Complaint
              </button>
            </div>
          </div>

          {/* POSH Register */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">POSH Section 21 Grievance Register</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Tracking formal complaints, inquiries, and resolution status</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Case Code</th>
                    <th className="py-3 px-4">Complainant</th>
                    <th className="py-3 px-4">Respondent</th>
                    <th className="py-3 px-4">Filing Date</th>
                    <th className="py-3 px-4">Summary</th>
                    <th className="py-3 px-4">ICC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poshData.complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.complaint_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{c.complainant_name}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{c.respondent_name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{c.filing_date}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={c.description}>{c.description}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status.includes('Resolved') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TDS SECTION 192 (FORM 12BB & DUAL REGIME CALCULATOR) */}
      {activeTab === 'tax_tds' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interactive Dual Regime Calculator */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  <span>Dual Regime Income Tax & TDS Calculator (FY 2025-26)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Monthly Gross Remuneration (₹)</label>
                  <input
                    type="number"
                    value={calcGross}
                    onChange={(e) => setCalcGross(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Section 80C Investment (Max ₹1.5L)</label>
                  <input
                    type="number"
                    value={calc80c}
                    onChange={(e) => setCalc80c(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Section 80D Mediclaim (₹)</label>
                  <input
                    type="number"
                    value={calc80d}
                    onChange={(e) => setCalc80d(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Annual HRA Rent Paid (₹)</label>
                  <input
                    type="number"
                    value={calcHra}
                    onChange={(e) => setCalcHra(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <button
                onClick={runTaxCalculator}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Compare Old vs New Tax Regime
              </button>

              {taxComparison && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className={`p-3 rounded-xl border ${
                    taxComparison.comparison.recommendedRegime === 'New' ? 'bg-indigo-50/70 border-indigo-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">New Tax Regime</span>
                      {taxComparison.comparison.recommendedRegime === 'New' && (
                        <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Std Deduction: ₹75,000</p>
                    <p className="text-base font-bold text-slate-900 mt-1">₹{taxComparison.comparison.newRegime.annualTax.toLocaleString()} / yr</p>
                    <p className="text-[11px] text-indigo-600 font-semibold font-mono mt-0.5">TDS: ₹{taxComparison.comparison.newRegime.monthlyTDS.toLocaleString()} / mo</p>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    taxComparison.comparison.recommendedRegime === 'Old' ? 'bg-indigo-50/70 border-indigo-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Old Tax Regime</span>
                      {taxComparison.comparison.recommendedRegime === 'Old' && (
                        <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Std Deduct + 80C/80D</p>
                    <p className="text-base font-bold text-slate-900 mt-1">₹{taxComparison.comparison.oldRegime.annualTax.toLocaleString()} / yr</p>
                    <p className="text-[11px] text-indigo-600 font-semibold font-mono mt-0.5">TDS: ₹{taxComparison.comparison.oldRegime.monthlyTDS.toLocaleString()} / mo</p>
                  </div>
                </div>
              )}
            </div>

            {/* Form 12BB Employee Submissions List */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="font-bold text-sm text-slate-800">Employee Form 12BB Declarations (FY 2025-26)</h3>
              <div className="overflow-y-auto max-h-80 space-y-2">
                {taxDeclarations.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{t.first_name} {t.last_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{t.employee_code} • {t.department_name}</p>
                      <p className="text-[10px] text-indigo-600 font-medium mt-0.5">80C: ₹{t.sec_80c_amount} | 80D: ₹{t.sec_80d_amount}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.regime === 'New' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.regime} Regime
                      </span>
                      <p className="text-[10px] text-emerald-600 font-medium mt-1">✓ {t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: B2B GST & DPA CONTRACTS */}
      {activeTab === 'gst_contracts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-600 uppercase">Statutory GST Registration</span>
              <h3 className="font-bold text-slate-800 text-sm">Egotech SaaS Subscription Invoicing</h3>
              <div className="space-y-1.5 text-xs text-slate-600">
                <p><strong>Egotech GSTIN:</strong> 27AAACE1234M1Z5 (Maharashtra)</p>
                <p><strong>SAC Code:</strong> 998314 (IT Software & SaaS Cloud Services)</p>
                <p><strong>Statutory Tax Rate:</strong> 18% GST (CGST 9% + SGST 9% or IGST 18%)</p>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Data Processing Agreement</span>
                <h3 className="font-bold text-slate-800 text-sm">DPDP Act 2023 DPA Contract</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mandatory contract between SaaS Vendor (Data Processor) and Client Organization (Data Fiduciary) covering
                  purpose limitation, breach notice, and data exit terms.
                </p>
              </div>
              {overview?.privacy?.dpa_signed ? (
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DPA Digitally Executed on {overview.privacy.dpa_signed_at?.split('T')[0]}</span>
                </div>
              ) : (
                <button
                  onClick={handleSignDpa}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow cursor-pointer transition"
                >
                  Execute Digital DPA Agreement
                </button>
              )}
            </div>
          </div>

          {/* GST Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">B2B SaaS Subscription Tax Invoices (SAC 998314)</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Automated GST invoices generated for client organization billing</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Client Organization</th>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">SAC Code</th>
                    <th className="py-3 px-4">Taxable Value</th>
                    <th className="py-3 px-4">GST (18%)</th>
                    <th className="py-3 px-4">Total Invoice Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{inv.client_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">GSTIN: {inv.client_gstin || '27AAACB5678P1Z2'}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.billing_month}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{inv.sac_code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">₹{Number(inv.taxable_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        ₹{(Number(inv.cgst_amount || 0) + Number(inv.sgst_amount || 0) + Number(inv.igst_amount || 0)).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">₹{Number(inv.total_amount).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      <Modal
        isOpen={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        title="Report Cybersecurity / Data Incident"
        subtitle="Activates CERT-In 6-Hour and DPDP 72-Hour Statutory Clocks"
      >
        <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Incident Title</label>
            <input
              type="text"
              required
              value={incidentForm.incident_title}
              onChange={(e) => setIncidentForm({ ...incidentForm, incident_title: e.target.value })}
              placeholder="e.g. Unauthorized access attempt on payroll API endpoint"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Incident Type</label>
              <select
                value={incidentForm.incident_type}
                onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="Data Leak / Breach">Data Leak / Breach</option>
                <option value="Unauthorized Access">Unauthorized Access</option>
                <option value="Ransomware">Ransomware</option>
                <option value="Phishing Attack">Phishing Attack</option>
                <option value="System Outage">System Outage</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Severity Rating</label>
              <select
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Initial Remediation Notes</label>
            <textarea
              rows={3}
              value={incidentForm.remediation_notes}
              onChange={(e) => setIncidentForm({ ...incidentForm, remediation_notes: e.target.value })}
              placeholder="Describe containment actions taken, affected accounts, and SOC investigation details."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIncidentModalOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow"
            >
              Start Statutory Incident Clocks
            </button>
          </div>
        </form>
      </Modal>

      {/* POSH Modal */}
      <Modal
        isOpen={poshModalOpen}
        onClose={() => setPoshModalOpen(false)}
        title="File Confidential POSH Grievance"
        subtitle="Delivered directly to the Internal Complaints Committee (ICC)"
      >
        <form onSubmit={handleFilePosh} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Respondent Name / Designation</label>
            <input
              type="text"
              required
              value={poshForm.respondent_name}
              onChange={(e) => setPoshForm({ ...poshForm, respondent_name: e.target.value })}
              placeholder="Full name of person against whom complaint is filed"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Date of Incident</label>
            <input
              type="date"
              required
              value={poshForm.incident_date}
              onChange={(e) => setPoshForm({ ...poshForm, incident_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Detailed Description of Incident</label>
            <textarea
              rows={4}
              required
              value={poshForm.description}
              onChange={(e) => setPoshForm({ ...poshForm, description: e.target.value })}
              placeholder="State the circumstances, location, any witnesses, and the nature of conduct."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confidential"
              checked={poshForm.is_confidential}
              onChange={(e) => setPoshForm({ ...poshForm, is_confidential: e.target.checked })}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="confidential" className="text-slate-700 font-medium">
              Keep complainant identity strictly confidential with the Presiding Officer
            </label>
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPoshModalOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-lg shadow"
            >
              Submit to ICC
            </button>
          </div>
        </form>
      </Modal>

      {/* Dossier Modal */}
      <Modal
        isOpen={dossierModalOpen}
        onClose={() => setDossierModalOpen(false)}
        title="Data Principal Personal Dossier"
        subtitle="Right to Access Export under DPDP Act 2023"
        maxWidth="max-w-2xl"
      >
        {selectedDossier && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
              <div><strong>Name:</strong> {selectedDossier.personal_info.name}</div>
              <div><strong>Code:</strong> {selectedDossier.personal_info.employee_code}</div>
              <div><strong>Email:</strong> {selectedDossier.personal_info.email}</div>
              <div><strong>PAN:</strong> {selectedDossier.personal_info.pan}</div>
              <div><strong>Masked Aadhaar:</strong> {selectedDossier.personal_info.aadhaar}</div>
              <div><strong>UAN (EPFO):</strong> {selectedDossier.personal_info.uan}</div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-1">Consents on Record</h4>
              <div className="space-y-1">
                {selectedDossier.consents_on_record.map((c, i) => (
                  <div key={i} className="p-2 bg-white border border-slate-100 rounded flex justify-between">
                    <span>{c.purpose}</span>
                    <span className="font-semibold text-emerald-600">{c.status} ({c.notice_version})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px]">
              {selectedDossier.statutory_notice}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDossierModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DPDP Anonymize Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(anonymizeEmployeeId)}
        onClose={() => setAnonymizeEmployeeId(null)}
        onConfirm={handleConfirmAnonymize}
        title="DPDP Act Right to Erasure / Anonymization"
        message="Are you sure you want to permanently scrub this employee's personally identifiable information (Name, Aadhaar, PAN, Bank Details)? Financial audit aggregates will be preserved to maintain statutory payroll books."
        confirmText="Execute Erasure"
        type="danger"
      />
    </div>
  );
}
