# Egotech: Modern Payroll & Attendance Management System

A full-stack, enterprise-grade **Payroll and Attendance Management System** built with **React 19**, **Tailwind CSS v4**, **Node.js / Express**, and high-performance **native SQLite** (`node:sqlite` in WAL mode).

---

## 🌟 Key Features

### ⏱️ 1. Attendance Management
- **Interactive Punch In/Out**: Real-time ticking clock, live session duration timer, and one-click clock-in and clock-out with optional location notes.
- **Smart Shift Rules & Late Detection**: Automatically compares clock-in timestamps against assigned shift timings (e.g. 09:00 AM) and grace periods (15 minutes).
- **Working Hours & Overtime Engine**: Automatically categorizes punches into `Present`, `Half Day`, or `Overtime` based on shift thresholds.
- **Master Attendance Dashboard (HR/Admin)**:
  - Filter by date, department, and status (`Present`, `Late`, `Half Day`, `Absent`, `On Leave`).
  - **Bulk Mark Present**: 1-click attendance marking for all or filtered active staff.
  - **Manual Punch Override**: Easily add or adjust clock-in/out times, status, and remarks for any employee.
- **Interactive Attendance Calendar**: Visual color-coded month grid (Present, Late, Half Day, Leave, Absent) with click-to-view day details.

### 🌴 2. Leave Management Workflow
- **Multi-Type Quota Tracking**: Pre-configured with Paid/Annual Leave, Sick Leave, Casual Leave, and Unpaid Leave (Loss of Pay).
- **Employee Leave Application**: Date-range picker, automated working-days calculation (excluding weekends), and real-time balance check.
- **HR Review & Approval Workflow**: HR managers can approve or reject pending requests with review notes.
- **Cross-Module Synchronization**: Approved leaves automatically populate attendance logs as `On Leave` and link with payroll calculations.

### 💰 3. Automated Payroll Engine
- **Monthly Payroll Batches**: Create and simulate payroll runs (e.g., October 2026) for all active employees.
- **Smart Proration & Deductions**:
  - Automatically factors in attendance records, unpaid leaves (Loss of Pay), and overtime hours.
  - Computes Gross Earnings = Base Salary + HRA + Conveyance + Medical + Special Allowance + Overtime Pay + Performance Bonus.
  - Computes Deductions = Provident Fund (PF) + Professional Tax + Health Insurance (ESI) + Income Tax (TDS) + LOP Deductions + Custom Deductions.
  - Computes Net Salary Payable.
- **Disbursement & Payment Tracking**: Review calculations, adjust spot bonuses or deductions, and commit batches with disbarment dates.

### 📄 4. Vectorized PDF Payslip Generation
- **Official Printable Payslips**: Generated on-the-fly using `PDFKit`.
- Features company header, employee summary, two-column itemized Earnings vs Deductions table, amount in numbers and words, and confidential digital stamp.
- Instant 1-click download from both employee portal and HR records.

### 📊 5. Reports & Analytics
- **Attendance Audit Report**: Monthly workforce metrics (Present days, Half days, Late marks, Leaves, Total hours, Overtime, Attendance Rate %).
- **Payroll Expenditure Report**: Annual and monthly payroll expenditure trends with interactive bar charts.
- **CSV Data Export**: One-click download of attendance and payroll reports in CSV format.

### 👑 6. Multi-Tenant SaaS & White-Label Client Co-Branding
- **Egotech Platform Owner (SaaS Vendor)**:
  - Egotech is the platform software company selling the multi-tenant SaaS product.
  - Complete control over onboarding client businesses (e.g., Microsoft, Nexus Cloud Solutions, Acme Corp).
  - Automatically provisions the client's **Administrator Account** with isolated workspace, departments, shifts, and leave quotas.
  - Generates instant copyable login credentials to send directly to the client owner.
- **Client Co-Branding & Customization**:
  - **Custom Client Logo**: Upload or link any client logo (e.g. Microsoft corporate logo).
  - **Brand Accent Color**: Tailored brand color (e.g. Microsoft Blue `#0078d4`) reflected across UI highlights and reports.
  - **"Powered By Egotech" Watermark**: Display `"Powered by Egotech"` watermark on the Sidebar header, Navbar, Login portal, and PDF Payslips.
  - **Pre-Configured Microsoft Showcase**: Switch to `admin@microsoft.com` with 1 click to view the live Microsoft-branded portal with "Powered by Egotech" co-branding.

### 🛡️ 7. Role-Based Access Control (RBAC) & Demo Switcher
- **Egotech Platform Owner**: Manage client tenant subscriptions, provision administrator accounts, configure global white-labeling.
- **Client Administrator**: Full control over their company's workforce directory, user accounts, shifts, and payroll batches.
- **HR Specialist**: Manage employee records, review leaves, master attendance, and execute monthly payroll runs.
- **Employee**: Self-service portal for clocking in/out, viewing attendance history, applying for leaves, and accessing payslips.
- **Built-in Quick Switcher**: Top banner with one-click instant login between Egotech Owner, Microsoft Admin, Nexus Admin, HR Manager, and Employee.

### ⚖️ 8. Statutory Compliance & Legal Governance Engine
- **The Four Labour Codes (Code on Wages 2025)**:
  - **50% Wage Ratio Rule**: Automatically monitors that Basic Pay + Dearness Allowance (DA) $\ge 50\%$ of Total Gross Remuneration.
  - **1-Click Wage Rebalancer**: Re-allocates excess allowances into Basic/DA with one click to keep payroll legally bulletproof.
  - **Statutory Deductions**: Real-time evaluation of EPF/EPS split (12% up to ₹15,000 statutory wage ceiling), ESIC (0.75% / 3.25% up to ₹21,000 threshold), State-wise Professional Tax (PT) slabs (Karnataka, Maharashtra, etc.), and Labour Welfare Fund (LWF).
  - **Statutory Exports**: Instant generation of EPFO ECR (.txt) filing strings, Corporate Bank Batch NACH/NEFT (.csv) files, and Form T Unified Wage Register.
- **DPDP Act 2023 & DPDP Rules 2025 Compliance**:
  - **Dual Legal Posture**: Egotech operates as a *Data Processor* for client employee payroll data and as a *Data Fiduciary* for tenant admin accounts.
  - **Data Principal Rights**: 1-click **Right to Access** (comprehensive employee data dossier export) and **Right to Erasure** (anonymizing PII while retaining audit-cleared financial records).
  - **Consent Management**: Explicit consent notice logging for salary processing, biometric punches, and tax reporting.
- **CERT-In Incident Management & 180-Day ICT Audit Trail**:
  - **6-Hour Breach Reporting Timer**: Active countdown monitor for reportable cybersecurity incidents under CERT-In Directions.
  - **72-Hour DPDP Board Breach Alert Clock**: Strict deadline tracker for DPDP Data Protection Board notifications.
  - **180-Day ICT System Logs**: Immutable system activity logging with IST timestamps, IP addresses, and user action codes, exportable in CSV format.
- **TDS Section 192 & Form 12BB Declarations**:
  - Supports both **New Tax Regime** (Section 115BAC) and **Old Tax Regime**.
  - Interactive tax declaration simulator computing 80C, 80D, HRA Section 10(13A), and Standard Deduction (₹75k / ₹50k).
- **POSH Act Grievance Portal**:
  - Internal Complaints Committee (ICC) roster management with External NGO Member designations.
  - Section 21 Annual Report generator with anonymous redressal metrics.
- **B2B SaaS GST Invoicing & DPA**:
  - GST invoicing under SAC code **998314** (Information Technology Software Services) with 18% GST (CGST+SGST / IGST).
  - 1-click execution of bilateral Data Processing Agreements (DPA) between Egotech and client tenants.
- **Aadhaar Masking & IT Act Digital Verification**:
  - Automatic masking of Aadhaar numbers (`XXXX-XXXX-1234`) ensuring UIDAI compliance.
  - IT Act SHA-256 digital signature verification hash printed on every vector PDF payslip with 8-year statutory retention markings.

---

## 🏗️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| **Backend API** | Node.js (ES Modules), Express.js |
| **Database** | Native SQLite (`node:sqlite`) in WAL mode (Zero external binaries needed) |
| **Document Generation** | PDFKit (Pure JavaScript vector PDF generation) |
| **Authentication** | JWT (JSON Web Tokens) & BCrypt password hashing |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ or v24+ (Recommended)
- **npm** v10+

### 2. Installation
Navigate to the project root directory:
```bash
cd payroll-attendance-system
```

Install root, backend, and frontend dependencies:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

cd ..
```

### 3. Seed Database
Run the pre-configured seed script to create departments, shifts, leave types, sample staff, 20+ days of attendance logs, and previous/current payroll batches:
```bash
cd server
npm run seed
cd ..
```

### 4. Start the Application
Run both backend API and React client concurrently:
```bash
node start.js
```
Or start them individually in separate terminals:
- **Backend API**: `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Frontend App**: `cd client && npm run dev` (Runs on `http://localhost:3000`)

Open your browser at: **`http://localhost:3000`**

---

## 🔑 Demo Login Credentials

You can log in manually using the credentials below, or click any role in the **One-Click Demo Switcher** banner at the top of the screen:

| Role | Email | Password | Organization | Co-Branding / Access Scope |
|---|---|---|---|---|
| **👑 Egotech Platform Owner (Vendor)** | `owner@egotech.com` / `owner@platform.com` | `owner123` | **Egotech Technologies Inc.** (Platform Owner) | Platform Vendor command center: onboard client tenants, provision admins, monitor global metrics & subscriptions |
| **🌐 Client Administrator (Microsoft)** | `admin@microsoft.com` | `msft123` | **Microsoft Corporation** (Client Tenant) | Client tenant workspace: **Microsoft Logo + "Powered by Egotech"** co-branding, manage staff, attendance & payroll |
| **🏢 Client Administrator (Nexus)** | `admin@nexus.io` | `nexus123` | **Nexus Cloud Solutions** (Client Tenant) | Client tenant workspace: Nexus Cloud branding, isolated workforce & payroll |
| **💼 HR Specialist** | `hr@company.com` | `hr123` | Client Tenant | Workforce attendance, leave review & approvals, payroll batches |
| **👤 Employee (John Doe)** | `john.doe@company.com` | `employee123` | Client Tenant | Personal clock-in/out, leave requests, personal payslips |

---

## 📁 Project Structure

```
payroll-attendance-system/
├── client/                     # React 19 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Attendance/     # PunchCard, AttendanceCalendar
│   │   │   ├── Common/         # Badge, Modal, StatsCard, QuickRoleBanner
│   │   │   └── Layout/         # Sidebar, Navbar, Shell Layout
│   │   ├── context/            # AuthContext (JWT, user state, quick switch)
│   │   ├── pages/              # Dashboard, Employees, Detail, Attendance, Leaves, Payroll, Payslips, Reports, Settings
│   │   ├── services/           # API fetch wrapper
│   │   ├── App.jsx             # React Router v7 configuration
│   │   └── main.jsx
│   ├── vite.config.js          # Vite configuration with API proxy to port 5000
│   └── package.json
├── server/                     # Express REST API Backend
│   ├── src/
│   │   ├── config/             # SQLite connection & schema migrations
│   │   ├── controllers/        # Auth, Employee, Attendance, Leave, Payroll, Report, Dashboard
│   │   ├── middleware/         # JWT authentication & RBAC authorization
│   │   ├── routes/             # Express API route modules
│   │   ├── seeds/              # Initial seed script with realistic staff & history
│   │   ├── services/           # Payroll engine calculations & PDFKit payslip renderer
│   │   └── index.js            # Express app entry point
│   ├── data/                   # SQLite database storage (payroll.db)
│   └── package.json
├── start.js                    # Cross-platform concurrent startup script
├── package.json                # Project root script orchestrator
└── README.md                   # System documentation
```
