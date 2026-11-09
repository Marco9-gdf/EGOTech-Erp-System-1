import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import Badge from '../components/Common/Badge';
import ConfirmModal from '../components/Common/ConfirmModal';
import {
  Settings as SettingsIcon,
  Building2,
  Lock,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  Server,
  Palette,
  Coins,
  MapPin,
  Crosshair,
  ShieldCheck,
  Database,
  Download,
  RotateCcw,
  Bell,
  Webhook,
  Send,
  Smartphone,
  Check,
  Radio,
} from 'lucide-react';
import { CURRENCY_OPTIONS } from '../utils/currencies';

export default function Settings() {
  const { user, role, isAdmin, refreshUser } = useAuth();
  const toast = useToast();

  // Company Settings
  const [company, setCompany] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currency_symbol: '$',
    currency_code: 'USD',
    logo_url: '',
    primary_color: '#0078d4',
    powered_by_text: 'Powered by Egotech',
    custom_tagline: '',
    geofencing_enabled: false,
    office_name: 'Headquarters',
    office_latitude: '',
    office_longitude: '',
    geofence_radius_meters: 200,
    slack_webhook_url: '',
    whatsapp_notifications_enabled: true,
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyMsg, setCompanyMsg] = useState('');
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Database Backups State
  const [backups, setBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState(null);

  // Webhooks State
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Password Change
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  // Shifts
  const [shifts, setShifts] = useState([]);

  const loadBackups = async () => {
    try {
      setLoadingBackups(true);
      const res = await api.getBackups();
      setBackups(res.backups || []);
    } catch (e) {
      // non-fatal
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const res = await api.getWebhookLogs();
      setWebhookLogs(res.logs || []);
    } catch (e) {
      // non-fatal
    }
  };

  useEffect(() => {
    api.getCompanySettings().then((res) => {
      if (res.company) {
        setCompany({
          name: res.company.name || res.company.company_name || '',
          email: res.company.email || res.company.company_email || '',
          phone: res.company.phone || res.company.company_phone || '',
          address: res.company.address || res.company.company_address || '',
          currency_symbol: res.company.currency_symbol || '$',
          currency_code: res.company.currency_code || 'USD',
          logo_url: res.company.logo_url || '',
          primary_color: res.company.primary_color || '#0078d4',
          powered_by_text: res.company.powered_by_text || 'Powered by Egotech',
          custom_tagline: res.company.custom_tagline || '',
          geofencing_enabled: Boolean(res.company.geofencing_enabled),
          office_name: res.company.office_name || 'Headquarters',
          office_latitude: res.company.office_latitude != null ? res.company.office_latitude : '',
          office_longitude: res.company.office_longitude != null ? res.company.office_longitude : '',
          geofence_radius_meters: res.company.geofence_radius_meters || 200,
          slack_webhook_url: res.company.slack_webhook_url || '',
          whatsapp_notifications_enabled: res.company.whatsapp_notifications_enabled != null ? Boolean(res.company.whatsapp_notifications_enabled) : true,
        });
      }
    }).catch(() => {});

    api.getShifts().then((res) => {
      setShifts(res.shifts || []);
    }).catch(() => {});

    if (isAdmin) {
      loadBackups();
      loadWebhookLogs();
    }
  }, [isAdmin]);

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      await api.createBackup('Manual snapshot triggered from Settings');
      toast.success('Database snapshot created successfully.', 'Backup Created');
      loadBackups();
    } catch (err) {
      toast.error(err.message || 'Failed to create backup.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupToRestore) return;
    try {
      await api.restoreBackup(selectedBackupToRestore.fileName);
      toast.success(`Database restored successfully from snapshot.`, 'Database Restored');
      setRestoreModalOpen(false);
      setSelectedBackupToRestore(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to restore snapshot.');
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      await api.testWebhook();
      toast.success('Test webhook dispatched to configured channels (Slack, Teams, WhatsApp).', 'Webhook Dispatched');
      loadWebhookLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch test webhook.');
    } finally {
      setTestingWebhook(false);
    }
  };

  const detectOfficeCoords = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.', 'GPS Unavailable');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCompany((prev) => ({
          ...prev,
          office_latitude: pos.coords.latitude.toFixed(6),
          office_longitude: pos.coords.longitude.toFixed(6),
        }));
        setGpsDetecting(false);
        toast.success(`Current GPS coordinates detected (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`, 'GPS Detected');
      },
      (err) => {
        toast.error('Could not determine current location: ' + err.message, 'GPS Error');
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      setSavingCompany(true);
      setCompanyMsg('');
      await api.updateCompanySettings({
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        currency_symbol: company.currency_symbol,
        currency_code: company.currency_code,
        logo_url: company.logo_url,
        primary_color: company.primary_color,
        powered_by_text: company.powered_by_text,
        custom_tagline: company.custom_tagline,
        geofencing_enabled: company.geofencing_enabled ? 1 : 0,
        office_name: company.office_name,
        office_latitude: company.office_latitude !== '' ? Number(company.office_latitude) : null,
        office_longitude: company.office_longitude !== '' ? Number(company.office_longitude) : null,
        geofence_radius_meters: company.geofence_radius_meters !== '' ? Number(company.geofence_radius_meters) : 200,
      });
      if (refreshUser) await refreshUser();
      toast.success('Organization profile, geofencing coordinates, and branding updated successfully.', 'Settings Saved');
      setCompanyMsg('Organization profile, geofencing coordinates, and branding updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update company settings.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassMsg('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      toast.error('New passwords do not match.');
      return;
    }

    try {
      setSavingPass(true);
      await api.updatePassword(curPassword, newPassword);
      toast.success('Your account password has been changed successfully.', 'Password Changed');
      setPassMsg('Password changed successfully.');
      setCurPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">System & Account Settings</h2>
        <p className="text-xs text-slate-500">Configure company organization, security credentials, and work shifts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings (Admin only) */}
        {isAdmin && (
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Company Organization Profile</h3>
            </div>

            {companyMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{companyMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={company.name || ''}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* White-Label Co-Branding Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700">
                  <Palette className="w-3.5 h-3.5" />
                  <span>White-Label Co-Branding</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Custom Company Logo URL</label>
                  <input
                    type="url"
                    value={company.logo_url || ''}
                    onChange={(e) => setCompany({ ...company, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Brand Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={company.primary_color || '#0078d4'}
                        onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 p-0.5 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={company.primary_color || '#0078d4'}
                        onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">"Powered By" Text</label>
                    <input
                      type="text"
                      value={company.powered_by_text || ''}
                      onChange={(e) => setCompany({ ...company, powered_by_text: e.target.value })}
                      placeholder="e.g. Powered by Egotech"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Client Tagline</label>
                  <input
                    type="text"
                    value={company.custom_tagline || ''}
                    onChange={(e) => setCompany({ ...company, custom_tagline: e.target.value })}
                    placeholder="e.g. Innovating the future of enterprise software"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="p-2.5 bg-slate-900 rounded-lg text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {company.logo_url ? (
                      <div className="w-7 h-7 bg-white rounded p-0.5 flex items-center justify-center shrink-0">
                        <img src={company.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: company.primary_color || '#0078d4' }}
                      >
                        {(company.name || 'Co').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{company.name || 'Company Name'}</p>
                      <p className="text-[10px] text-amber-400 font-medium">{company.powered_by_text || 'Powered by Egotech'}</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">Preview</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={company.email || ''}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={company.phone || ''}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
                <input
                  type="text"
                  value={company.address || ''}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              {/* Primary Operating Currency Dropdown & Customizer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <Coins className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Primary Operating Currency</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                    Active: {company.currency_code} ({company.currency_symbol})
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Select Currency from Dropdown</label>
                  <select
                    value={CURRENCY_OPTIONS.some((c) => c.code === company.currency_code) ? company.currency_code : 'CUSTOM'}
                    onChange={(e) => {
                      const selected = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                      if (selected) {
                        setCompany({
                          ...company,
                          currency_code: selected.code,
                          currency_symbol: selected.symbol,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Currency...</option>
                  </select>
                </div>

                {/* Quick Currency Selector Chips */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[10px] text-slate-400">Quick Change:</span>
                  {[
                    { code: 'USD', symbol: '$' },
                    { code: 'INR', symbol: '₹' },
                    { code: 'EUR', symbol: '€' },
                    { code: 'GBP', symbol: '£' },
                    { code: 'AED', symbol: 'د.إ' },
                    { code: 'CAD', symbol: 'C$' },
                  ].map((q) => (
                    <button
                      key={q.code}
                      type="button"
                      onClick={() => setCompany({ ...company, currency_code: q.code, currency_symbol: q.symbol })}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold transition cursor-pointer ${
                        company.currency_code === q.code
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {q.code} ({q.symbol})
                    </button>
                  ))}
                </div>

                {/* Symbol & Code Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={company.currency_symbol || '$'}
                      onChange={(e) => setCompany({ ...company, currency_symbol: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                      placeholder="e.g. ₹ or $"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Currency ISO Code</label>
                    <input
                      type="text"
                      value={company.currency_code || 'USD'}
                      onChange={(e) => setCompany({ ...company, currency_code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-200 rounded-lg bg-white"
                      placeholder="e.g. INR or USD"
                      required
                    />
                  </div>
                </div>

                {/* Live Formatted Preview */}
                <div className="p-2.5 bg-slate-900 rounded-lg text-white flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">Sample Payroll & Payslip Display:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {company.currency_symbol || '$'} 75,000.00 {company.currency_code}
                  </span>
                </div>
              </div>

              {/* Office Geofencing & GPS Security */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Office Geo-Fencing & Proximity Bounds</h4>
                      <p className="text-[11px] text-slate-500">Require employees to be physically within office radius to clock in</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={company.geofencing_enabled}
                      onChange={(e) => setCompany({ ...company, geofencing_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Office Name / Location</label>
                    <input
                      type="text"
                      value={company.office_name || ''}
                      onChange={(e) => setCompany({ ...company, office_name: e.target.value })}
                      placeholder="e.g. Headquarters Silicon Valley"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Allowed Radius (Meters)</label>
                    <input
                      type="number"
                      min="20"
                      max="10000"
                      value={company.geofence_radius_meters || 200}
                      onChange={(e) => setCompany({ ...company, geofence_radius_meters: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Office Latitude</label>
                    <input
                      type="text"
                      value={company.office_latitude || ''}
                      onChange={(e) => setCompany({ ...company, office_latitude: e.target.value })}
                      placeholder="e.g. 37.7749"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Office Longitude</label>
                    <input
                      type="text"
                      value={company.office_longitude || ''}
                      onChange={(e) => setCompany({ ...company, office_longitude: e.target.value })}
                      placeholder="e.g. -122.4194"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={detectOfficeCoords}
                  disabled={gpsDetecting}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  <Crosshair className={`w-3.5 h-3.5 text-indigo-600 ${gpsDetecting ? 'animate-spin' : ''}`} />
                  <span>{gpsDetecting ? 'Detecting Coordinates...' : 'Detect & Use My Current GPS Coordinates'}</span>
                </button>
              </div>

              {/* Multi-Channel Webhooks & Dispatches Config */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700">
                  <Webhook className="w-3.5 h-3.5" />
                  <span>Automated Webhooks & Notifications</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Slack / Microsoft Teams Webhook URL</label>
                  <input
                    type="url"
                    value={company.slack_webhook_url || ''}
                    onChange={(e) => setCompany({ ...company, slack_webhook_url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Real-time notifications for leave approvals, expenses, Maker-Checker payroll releases, and CERT-In alerts.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">WhatsApp & SMS Gateway Delivery</span>
                    <span className="text-[10px] text-slate-400">Dispatch simulated/live WhatsApp template alerts on key events</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(company.whatsapp_notifications_enabled)}
                      onChange={(e) => setCompany({ ...company, whatsapp_notifications_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCompany}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCompany ? 'Saving...' : 'Update Organization Details & Branding'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Password & Security */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Lock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Security & Password</h3>
          </div>

          {passMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{passMsg}</span>
            </div>
          )}

          {passError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                value={curPassword}
                onChange={(e) => setCurPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingPass}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPass ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Shifts & System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shifts Table */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-sm">Configured Work Shifts</h3>
          </div>
          <div className="space-y-3">
            {shifts.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-[10px] text-slate-400">
                    Grace period: {s.grace_period_minutes} mins • Full day: {s.full_day_hours} hrs
                  </p>
                </div>
                <div className="text-right font-mono font-medium text-indigo-600">
                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Architecture */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-sm">System Architecture & Specs</h3>
          </div>
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400">Application Framework</span>
              <span className="font-semibold text-slate-800">React 19 + Vite 8 + Tailwind CSS</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400">Backend Server</span>
              <span className="font-semibold text-slate-800">Node.js + Express REST API</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-800">Native SQLite (node:sqlite WAL Mode)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400">Document Engine</span>
              <span className="font-semibold text-slate-800">PDFKit Vectorized Payslip Renderer</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-400">Authentication</span>
              <span className="font-semibold text-slate-800">JWT + BCrypt Role-Based Access Control</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Database Backups & Webhook Dispatch Logs (Admin/Owner only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Backups & CERT-In Disaster Recovery Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Database Backups & Disaster Recovery</h3>
                    <p className="text-[10px] text-slate-400">CERT-In 180-Day ICT retention & point-in-time recovery</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200/80 transition-colors cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${creatingBackup ? 'animate-spin' : ''}`} />
                  <span>{creatingBackup ? 'Snapshotting...' : 'Create Snapshot'}</span>
                </button>
              </div>

              {loadingBackups ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading backup archives...</div>
              ) : backups.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No snapshot archives recorded yet.</div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {backups.map((b) => (
                    <div
                      key={b.fileName}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono font-medium text-slate-800 truncate text-[11px]">{b.fileName}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST • <span className="font-semibold text-slate-600">{b.size}</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <a
                          href={api.getBackupDownloadUrl(b.fileName)}
                          download
                          className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                          title="Download Backup Snapshot"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBackupToRestore(b);
                            setRestoreModalOpen(true);
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold rounded-lg border border-amber-200/70 transition-colors cursor-pointer"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <ShieldCheck className="w-4 h-4" /> WAL Mode Active
              </span>
              <span>{backups.length} snapshots cataloged</span>
            </div>
          </div>

          {/* Webhook Dispatch & Notification Logs Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <Webhook className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Webhook Delivery & Audit Logs</h3>
                    <p className="text-[10px] text-slate-400">Real-time dispatches to Slack, WhatsApp & SMS</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/80 transition-colors cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                  <span>{testingWebhook ? 'Sending...' : 'Test Dispatch'}</span>
                </button>
              </div>

              {webhookLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No webhooks dispatched yet. Click "Test Dispatch" or approve an expense/leave.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {webhookLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                            log.channel === 'slack' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.channel}
                          </span>
                          <span className="font-semibold text-slate-800 truncate text-[11px]">{log.event_type}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        log.status_code === 200 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {log.status_code} OK
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-slate-500 font-mono text-[10px]">
                {company.slack_webhook_url ? 'Slack URL Connected' : 'Slack URL Unset'}
              </span>
              <span>{webhookLogs.length} events logged</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Database Restore */}
      <ConfirmModal
        isOpen={restoreModalOpen}
        title="Restore Database Snapshot"
        message={`Are you sure you want to restore the database from "${selectedBackupToRestore?.fileName}"? A temporary safety snapshot of current data will be saved before restore.`}
        confirmText="Restore Snapshot"
        confirmVariant="danger"
        onConfirm={handleConfirmRestore}
        onCancel={() => {
          setRestoreModalOpen(false);
          setSelectedBackupToRestore(null);
        }}
      />
    </div>
  );
}
