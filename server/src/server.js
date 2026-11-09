import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db, { initDatabase } from './config/database.js';

import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import biometricRoutes from './routes/biometricRoutes.js';
import lifecycleRoutes from './routes/lifecycleRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { getEmailLogs } from './services/emailService.js';
import { authenticateToken, requireRoles } from './middleware/auth.js';

dotenv.config();

// Initialize tables
initDatabase();

// Ensure Platform Owner & Admin accounts exist with master password 826999
try {
  const masterPasswordHash = bcrypt.hashSync('826999', 10);

  const keyAccounts = [
    { email: 'khiladiharsh786@gmail.com', name: 'Harsh Shrivastava (Platform Owner)', role: 'owner' },
    { email: 'admin@egotech.com', name: 'Egotech Admin', role: 'admin' },
    { email: 'owner@egotech.com', name: 'Platform Owner', role: 'owner' },
    { email: 'admin@company.com', name: 'Operations Admin', role: 'admin' },
    { email: 'hr@company.com', name: 'Eleanor Vance (HR)', role: 'hr' },
    { email: 'john.doe@company.com', name: 'John Doe (Staff)', role: 'employee' },
    { email: 'owner@platform.com', name: 'Platform Owner', role: 'owner' },
  ];

  for (const acc of keyAccounts) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(acc.email);
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, status = ?, role = ? WHERE id = ?').run(masterPasswordHash, 'Active', acc.role, existing.id);
    } else {
      db.prepare(`
        INSERT INTO users (company_id, name, email, password_hash, role, status)
        VALUES (1, ?, ?, ?, ?, 'Active')
      `).run(acc.name, acc.email, masterPasswordHash, acc.role);
    }
  }
  console.log('👑 Verified: Platform Owner & Admin accounts initialized with password 826999');
} catch (e) {
  console.warn('Startup account verification warning:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== '/api/health') {
      console.log(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
    }
  });
  next();
});

// Resolve compiled React frontend if present (Render, Railway, production full-stack deployment)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const possibleClientDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist'),
];
const clientDistPath = possibleClientDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`📦 Serving compiled static client frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
} else {
  // Headless mode fallback: only show JSON on root / if client dist does not exist
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      service: 'Egotech SaaS Platform API',
      version: '1.0.0',
      port: PORT,
      message: 'Backend server is running successfully on port ' + PORT,
      frontend: 'http://localhost:3000',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        companies: '/api/companies',
        accounts: '/api/accounts',
        employees: '/api/employees',
        attendance: '/api/attendance',
        leaves: '/api/leaves',
        payroll: '/api/payroll',
        settings: '/api/settings/company',
      },
    });
  });
}

app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    service: 'Egotech SaaS Platform API',
    health: '/api/health',
    frontend: 'http://localhost:3000',
    message: 'Egotech REST API is fully operational and ready to receive requests.',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Egotech SaaS Platform API',
  });
});

// Interactive Digital Receipt Viewer for Expenses
app.get(['/receipts/:fileName', '/api/receipts/:fileName'], (req, res) => {
  const { fileName } = req.params;
  const isBostonTaxi = fileName.includes('boston') || fileName.includes('taxi');

  const merchant = isBostonTaxi ? 'Boston Express Cab & Ground Transit LLC' : 'Egotech Verified Vendor';
  const category = isBostonTaxi ? 'Travel & Mileage' : 'Business Expense';
  const amount = isBostonTaxi ? '$185.50' : '$120.00';
  const date = 'October 31, 2026';
  const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital Receipt Voucher - ${fileName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; padding: 40px 20px; color: #1e293b; }
    .receipt-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; position: relative; }
    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 24px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 12px; }
    .merchant { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .subtext { font-size: 12px; color: #64748b; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; background: #f8fafc; padding: 14px; border-radius: 14px; margin-bottom: 20px; border: 1px solid #f1f5f9; }
    .meta-item label { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
    .meta-item span { font-weight: 600; color: #334155; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    .items-table th { text-align: left; padding: 8px 4px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    .items-table td { padding: 10px 4px; border-bottom: 1px solid #f8fafc; }
    .total-row td { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 14px; }
    .stamp { margin-top: 24px; padding: 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; text-align: center; }
    .stamp-text { font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; }
    .stamp-sub { font-size: 10px; color: #6366f1; margin-top: 2px; }
    .actions { display: flex; gap: 10px; margin-top: 24px; }
    .btn { flex: 1; padding: 10px; font-size: 12px; font-weight: 600; border-radius: 12px; cursor: pointer; text-align: center; border: none; }
    .btn-print { background: #4f46e5; color: #fff; }
    .btn-print:hover { background: #4338ca; }
    .btn-close { background: #f1f5f9; color: #475569; }
    .btn-close:hover { background: #e2e8f0; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt-card { box-shadow: none; border: none; padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="badge">Verified Expense Voucher</div>
      <div class="merchant">${merchant}</div>
      <div class="subtext">Official Electronic Reimbursement Document</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Voucher Number</label>
        <span>${receiptNo}</span>
      </div>
      <div class="meta-item">
        <label>Expense Date</label>
        <span>${date}</span>
      </div>
      <div class="meta-item">
        <label>Employee Name</label>
        <span>Alexander Wright (EMP0001)</span>
      </div>
      <div class="meta-item">
        <label>Payment Method</label>
        <span>Corporate Visa (•••• 4092)</span>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 600;">Airport Transfer (Logan Terminal 2 to Downtown)</div>
            <div style="font-size: 10px; color: #94a3b8;">Trip Distance: 14.8 miles • Fare ID: BOS-8241</div>
          </td>
          <td style="text-align: right; font-weight: 600;">$145.00</td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 600;">MassDOT Highway Tolls & Airport Access Surcharge</div>
            <div style="font-size: 10px; color: #94a3b8;">Sumner Tunnel Electronic Toll</div>
          </td>
          <td style="text-align: right; font-weight: 600;">$18.50</td>
        </tr>
        <tr>
          <td>
            <div style="font-weight: 600;">Driver Gratuity (Approved Company Policy)</div>
            <div style="font-size: 10px; color: #94a3b8;">15% Standard Driver Tip</div>
          </td>
          <td style="text-align: right; font-weight: 600;">$22.00</td>
        </tr>
        <tr class="total-row">
          <td>Total Reimbursable Amount</td>
          <td style="text-align: right; color: #4f46e5;">${amount}</td>
        </tr>
      </tbody>
    </table>

    <div class="stamp">
      <div class="stamp-text">✓ Approved by HR & Finance Department</div>
      <div class="stamp-sub">Recorded in Egotech Payroll & Disbursed • Hash: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
    </div>

    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">Print / Save as PDF</button>
      <button class="btn btn-close" onclick="window.close()">Close Window</button>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Company Settings endpoint
app.get('/api/settings/company', authenticateToken, (req, res) => {
  const companyId = req.currentUser.company_id || 1;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {
    name: 'Egotech Technologies Inc.',
    email: 'hr@company.com',
    phone: '+1 (555) 019-2834',
    address: '100 Innovation Way, Silicon Valley, CA',
    currency_symbol: '$',
    currency_code: 'USD',
  };
  res.json({ company });
});

app.put('/api/settings/company', authenticateToken, requireRoles('admin', 'owner'), (req, res) => {
  const companyId = req.currentUser.company_id || 1;
  const {
    name,
    email,
    phone,
    address,
    currency_symbol,
    currency_code,
    logo_url,
    primary_color,
    powered_by_text,
    powered_by_logo,
    vendor_logo_url,
    custom_tagline,
    geofencing_enabled,
    office_name,
    office_latitude,
    office_longitude,
    geofence_radius_meters,
  } = req.body;

  db.prepare(`
    UPDATE companies SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      currency_symbol = COALESCE(?, currency_symbol),
      currency_code = COALESCE(?, currency_code),
      logo_url = COALESCE(?, logo_url),
      primary_color = COALESCE(?, primary_color),
      powered_by_text = COALESCE(?, powered_by_text),
      powered_by_logo = COALESCE(?, powered_by_logo),
      vendor_logo_url = COALESCE(?, vendor_logo_url),
      custom_tagline = COALESCE(?, custom_tagline),
      geofencing_enabled = COALESCE(?, geofencing_enabled),
      office_name = COALESCE(?, office_name),
      office_latitude = COALESCE(?, office_latitude),
      office_longitude = COALESCE(?, office_longitude),
      geofence_radius_meters = COALESCE(?, geofence_radius_meters),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ?? null,
    email ?? null,
    phone ?? null,
    address ?? null,
    currency_symbol ?? null,
    currency_code ?? null,
    logo_url ?? null,
    primary_color ?? null,
    powered_by_text ?? null,
    powered_by_logo ?? null,
    vendor_logo_url ?? null,
    custom_tagline ?? null,
    geofencing_enabled != null ? (geofencing_enabled ? 1 : 0) : null,
    office_name ?? null,
    office_latitude != null ? Number(office_latitude) : null,
    office_longitude != null ? Number(office_longitude) : null,
    geofence_radius_meters != null ? Number(geofence_radius_meters) : null,
    companyId
  );

  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);

  res.json({ message: 'Company settings, geofencing, and branding updated successfully.', company: updated });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/lifecycle', lifecycleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Email Logs Audit Trail
app.get('/api/email-logs', authenticateToken, (req, res) => {
  const companyId = req.currentUser.company_id || 1;
  const logs = getEmailLogs(companyId);
  res.json({ logs });
});

// SPA client fallback: serve index.html for all non-API GET requests
if (clientDistPath) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/receipts')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// Only bind port in standard Node server mode (avoid conflict in Vercel serverless functions)
if (!process.env.VERCEL && !process.env.LAMBDA_TASK_ROOT) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`🚀 Egotech SaaS Platform Server on port ${PORT}`);
    console.log(`   Local URL:    http://localhost:${PORT}`);
    console.log(`   API Endpoint: http://localhost:${PORT}/api`);
    console.log(`================================================`);
  });
}

export default app;
