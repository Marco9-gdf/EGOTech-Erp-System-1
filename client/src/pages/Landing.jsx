import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CURRENCY_OPTIONS } from '../utils/currencies';
import {
  ShieldCheck,
  Zap,
  CreditCard,
  MapPin,
  Receipt,
  Mail,
  CheckCircle2,
  Users,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Building2,
  Lock,
  Globe,
  Coins,
  Check,
  Star,
  Layers,
  FileText,
  Clock,
  Crown,
  Laptop
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  // Pricing State
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  // Trial Registration Modal State
  const [isTrialOpen, setIsTrialOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Pro');
  const [form, setForm] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    currency_code: 'USD',
    currency_symbol: '$',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleOpenTrial = (planName = 'Pro') => {
    setSelectedPlan(planName);
    setError(null);
    setIsTrialOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.admin_email || !form.admin_password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.admin_password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.registerCompany({
        company_name: form.company_name,
        admin_name: form.admin_name,
        admin_email: form.admin_email,
        admin_password: form.admin_password,
        plan: selectedPlan,
        currency_code: form.currency_code,
        currency_symbol: form.currency_symbol,
      });

      if (res.token && res.user) {
        localStorage.setItem('payroll_token', res.token);
        localStorage.setItem('payroll_user', JSON.stringify(res.user));
        if (loginWithToken) {
          await loginWithToken(res.token, res.user);
        }
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete trial registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Egotech
              </span>
              <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                SaaS Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#geofencing" className="hover:text-white transition">GPS Geofencing</a>
            <a href="#reimbursements" className="hover:text-white transition">Expenses</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <button
              onClick={() => handleOpenTrial('Pro')}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 transition cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Empower Clients with Custom White-Label HR & Payroll</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.12]">
            The Modern Payroll, GPS Attendance &amp; Reimbursement Suite
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            Multi-tenant SaaS engineered for platform owners, enterprise clients, and growing organizations. Deliver automated vector PDF payslip email disbursements, location-aware biometric geofencing, and employee expense rollups.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleOpenTrial('Pro')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-linear-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-semibold text-base transition flex items-center justify-center space-x-2"
            >
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span>Explore Live Workspace Demo</span>
            </Link>
          </div>

          {/* Value Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant Organization Provisioning</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>White-Label Co-Branding</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: White-Label Co-Branding */}
      <section id="features" className="py-20 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                White-Label Co-Branding for Every Enterprise Client
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                As a platform provider, sell your HR software seamlessly. Clients enjoy their custom logo, corporate primary color themes, and custom currency symbols, proudly accompanied by your <strong className="text-amber-400">"Powered by [Your Company]"</strong> co-branding badge across all dashboards, payslips, and automated emails.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Dynamic Multi-Currency Support (15+ International ISO codes: USD, EUR, INR, GBP, AED, CAD, JPY, and more).</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Custom corporate accent colors, company taglines, and dual-logo payslip headers.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Isolated database multi-tenancy preventing data cross-leakage between organizations.</span>
                </div>
              </div>
            </div>

            {/* Visual Card */}
            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center">
                    <span className="font-black text-slate-900 text-xs">ORG</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Client Enterprise Tenant</p>
                    <p className="text-[10px] text-amber-400 font-medium">Powered by Egotech</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active Client
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px]">Monthly Disbursement</p>
                  <p className="text-base font-bold text-white mt-0.5">$384,500.00</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-[10px]">Active Personnel</p>
                  <p className="text-base font-bold text-indigo-400 mt-0.5">84 Employees</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Default Currency Symbol:</span>
                <span className="font-mono font-bold text-emerald-400">$ (USD)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: GPS Geofencing */}
      <section id="geofencing" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Radar */}
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-4 order-2 lg:order-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Office Geofence Radar</span>
                </div>
                <span className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Enforcement Active</span>
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Target Office:</span>
                  <span className="font-bold text-white">Silicon Valley HQ</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Allowed Radius:</span>
                  <span className="font-bold text-white">200 meters</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Calculated Distance:</span>
                  <span className="font-bold text-emerald-400">38 meters (Within Bounds)</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Punch Verified: Employee coordinates matched designated office coordinates.</span>
              </div>
            </div>

            <div className="space-y-6 order-1 lg:order-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Location-Aware Attendance &amp; Haversine Geofencing
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Eliminate proxy clock-ins and remote punch fraud. Egotech calculates real-time proximity down to the exact meter using the mathematical Haversine spherical distance formula.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Live Browser HTML5 Geolocation detection with radar indicator.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Strict mode blocking punches outside designated company radius (e.g., 200m).</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Attendance audit trails with recorded latitude, longitude, and meter deviation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Expense Reimbursements & PDF Payslip Delivery */}
      <section id="reimbursements" className="py-20 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Automated Expense Claims &amp; One-Click Email Payslips
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Employees submit business travel, meals, and software claims with receipt proofs. Once approved by HR, claims roll straight into monthly payroll disbursements as reimbursed earnings.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Multi-category submission: Travel, Meals, Hardware, Software, and Medical.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Automatic PDF attachment delivery via production SMTP or simulated engine.</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">SQLite audit logging of every outgoing email with timestamps and delivery status.</span>
                </div>
              </div>
            </div>

            {/* Email Payslip Sample */}
            <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold text-white">Disbursement Email Preview</span>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <p className="text-slate-400"><strong>Subject:</strong> Your Payslip for October 2026 - Egotech Payroll</p>
                <p className="text-slate-400"><strong>Attachment:</strong> <span className="font-mono text-indigo-400">Payslip-EMP001-10-2026.pdf (142 KB)</span></p>
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Salary:</span>
                    <span className="font-bold text-white">$4,500.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approved Reimbursements:</span>
                    <span className="font-bold text-emerald-400">+$320.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-xs">
                    <span className="font-bold text-white">Net Disbursed:</span>
                    <span className="font-bold text-emerald-400">$4,320.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Transparent, Scalable SaaS Pricing
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Choose the tier that matches your workforce. Upgrade or cancel anytime with zero lock-in.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 mt-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  billingCycle === 'annual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual Billing (Save 20%)
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">For early-stage companies and small offices.</p>
                <div className="mt-5 flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'annual' ? '$39' : '$49'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 25 Active Employees</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated Monthly Payroll Engine</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Self-Service Attendance Punches</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Downloadable Vector PDF Payslips</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenTrial('Starter')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Pro - Featured */}
            <div className="relative p-8 rounded-3xl bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-linear-to-r from-indigo-500 to-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <p className="text-xs text-slate-400 mt-1">For growing companies needing geofencing and white-labeling.</p>
                <div className="mt-5 flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'annual' ? '$119' : '$149'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Up to 100 Active Employees</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>GPS Haversine Office Geofencing</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Expense Claims &amp; Payroll Rollup</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Automated Email Delivery of Payslips</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>White-Label Client Co-Branding</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenTrial('Pro')}
                className="mt-8 w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition cursor-pointer"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">For multi-office corporations and high-volume operations.</p>
                <div className="mt-5 flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'annual' ? '$239' : '$299'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>500+ Active Employees</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-Branch Geofencing Zones</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custom SMTP Integration &amp; Logs</span>
                  </li>
                  <li className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Priority 24/7 SLA &amp; Support</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenTrial('Enterprise')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-bold">Egotech SaaS Platform</span>
            <span>• &copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-slate-400">
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
            <button onClick={() => handleOpenTrial('Pro')} className="hover:text-white transition cursor-pointer">
              14-Day Trial
            </button>
          </div>
        </div>
      </footer>

      {/* Trial Registration Modal */}
      {isTrialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-left">
            <button
              onClick={() => setIsTrialOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Start Your 14-Day Free Trial</h3>
                <p className="text-xs text-slate-400">Plan: <strong className="text-indigo-400">{selectedPlan}</strong> • Instant Workspace Setup</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="e.g. Acme Innovations Inc."
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Full Name *</label>
                  <input
                    type="text"
                    value={form.admin_name}
                    onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
                  <input
                    type="email"
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    placeholder="sarah@acme.com"
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Password (min. 6 chars) *</label>
                <input
                  type="password"
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Operating Currency</label>
                <select
                  value={form.currency_code}
                  onChange={(e) => {
                    const sel = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                    if (sel) {
                      setForm({ ...form, currency_code: sel.code, currency_symbol: sel.symbol });
                    }
                  }}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Provisioning Tenant Workspace...' : 'Launch Free 14-Day Trial Now'}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 text-center">
                By clicking launch, you agree to our Terms of Service. No credit card required.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
