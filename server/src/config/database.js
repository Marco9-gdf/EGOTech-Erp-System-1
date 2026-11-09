import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.LAMBDA_TASK_ROOT);
const dbDir = isServerless
  ? path.join('/tmp', 'payroll_data')
  : path.resolve(__dirname, '../../data');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'payroll.db');

// If running in Vercel/serverless and DB does not exist in /tmp, copy the bundled seeded database
if (isServerless && !fs.existsSync(dbPath)) {
  const bundledDbPath = path.resolve(__dirname, '../../data/payroll.db');
  if (fs.existsSync(bundledDbPath)) {
    try {
      fs.copyFileSync(bundledDbPath, dbPath);
    } catch (e) {
      console.warn('Could not copy bundled DB to /tmp:', e.message);
    }
  }
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  // 1. Client Companies Table (Multi-Tenant Support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      currency_symbol TEXT DEFAULT '$',
      currency_code TEXT DEFAULT 'USD',
      plan TEXT DEFAULT 'Enterprise',
      status TEXT DEFAULT 'Active',
      max_employees INTEGER DEFAULT 100,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure default company exists (Egotech Technologies)
  const existingCompany = db.prepare('SELECT id FROM companies WHERE id = 1').get();
  if (!existingCompany) {
    db.prepare(`
      INSERT INTO companies (id, name, code, email, phone, address, currency_symbol, currency_code, plan, status)
      VALUES (1, 'Egotech Technologies Inc.', 'EGOTECH', 'contact@egotech.com', '+1 (555) 019-2834', '100 Innovation Way, Suite 400, Silicon Valley, CA 94025', '$', 'USD', 'Enterprise', 'Active')
    `).run();
  }

  // 2. Company Settings Table (Compatibility)
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      company_name TEXT NOT NULL,
      company_email TEXT,
      company_phone TEXT,
      company_address TEXT,
      currency_symbol TEXT DEFAULT '$',
      currency_code TEXT DEFAULT 'USD',
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Departments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, name)
    );
  `);

  // 4. Shifts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_period_minutes INTEGER DEFAULT 15,
      half_day_hours REAL DEFAULT 4.0,
      full_day_hours REAL DEFAULT 8.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Employees Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      department_id INTEGER,
      designation TEXT NOT NULL,
      joining_date TEXT NOT NULL,
      employment_type TEXT DEFAULT 'Full-Time',
      shift_id INTEGER,
      status TEXT DEFAULT 'Active',
      avatar_url TEXT,
      bank_name TEXT,
      bank_account_no TEXT,
      bank_ifsc TEXT,
      tax_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    );
  `);

  // 6. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 7. Salary Structures
  db.exec(`
    CREATE TABLE IF NOT EXISTS salary_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      base_salary REAL NOT NULL DEFAULT 0,
      hra REAL DEFAULT 0,
      conveyance_allowance REAL DEFAULT 0,
      medical_allowance REAL DEFAULT 0,
      special_allowance REAL DEFAULT 0,
      provident_fund REAL DEFAULT 0,
      professional_tax REAL DEFAULT 0,
      health_insurance REAL DEFAULT 0,
      tds_tax REAL DEFAULT 0,
      overtime_rate_per_hour REAL DEFAULT 0,
      effective_date TEXT DEFAULT CURRENT_DATE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 8. Attendance Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      working_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Present',
      is_late INTEGER DEFAULT 0,
      notes TEXT,
      ip_address TEXT,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 9. Leave Types Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      default_days_per_year INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 1,
      color TEXT DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, code)
    );
  `);

  // 10. Leave Balances Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      total_days REAL NOT NULL,
      used_days REAL DEFAULT 0,
      UNIQUE(employee_id, leave_type_id, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
    );
  `);

  // 11. Leave Requests Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      reviewed_by INTEGER,
      review_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 12. Payroll Batches Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      batch_name TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      total_gross REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      total_net REAL DEFAULT 0,
      processed_by INTEGER,
      processed_at DATETIME,
      payment_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(company_id, month, year),
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 13. Payslips Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_batch_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      base_salary REAL NOT NULL,
      hra REAL DEFAULT 0,
      conveyance REAL DEFAULT 0,
      medical REAL DEFAULT 0,
      special_allowance REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      total_earnings REAL NOT NULL,
      provident_fund REAL DEFAULT 0,
      professional_tax REAL DEFAULT 0,
      health_insurance REAL DEFAULT 0,
      tds_tax REAL DEFAULT 0,
      lop_deduction REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      total_deductions REAL NOT NULL,
      net_salary REAL NOT NULL,
      total_working_days INTEGER NOT NULL,
      present_days REAL NOT NULL,
      paid_leaves REAL DEFAULT 0,
      unpaid_leaves REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'Generated',
      payment_method TEXT DEFAULT 'Bank Transfer',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, month, year),
      FOREIGN KEY (payroll_batch_id) REFERENCES payroll_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 14. Expense Claims & Reimbursements Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency_symbol TEXT DEFAULT '$',
      expense_date TEXT NOT NULL,
      description TEXT,
      receipt_url TEXT,
      status TEXT DEFAULT 'Pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      review_notes TEXT,
      payroll_batch_id INTEGER,
      reimbursed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (payroll_batch_id) REFERENCES payroll_batches(id) ON DELETE SET NULL
    );
  `);

  // 15. Notification & Email Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'Sent',
      metadata TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 16. ICT & Security Audit Logs Table (CERT-In 180-Day Log Mandate)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT DEFAULT '127.0.0.1',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 17. Security Incidents Table (CERT-In 6-Hour & DPDP 72-Hour Breach Tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      incident_title TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      reported_by INTEGER,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cert_in_deadline DATETIME,
      cert_in_status TEXT DEFAULT 'Pending Notice',
      cert_in_reported_at DATETIME,
      dpdp_deadline DATETIME,
      dpdp_status TEXT DEFAULT 'Pending Assessment',
      dpdp_reported_at DATETIME,
      remediation_notes TEXT,
      status TEXT DEFAULT 'Investigating',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 18. POSH Act Complaints & ICC Register Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posh_complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      complaint_code TEXT UNIQUE NOT NULL,
      complainant_name TEXT,
      respondent_name TEXT NOT NULL,
      incident_date TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Submitted',
      icc_presiding_officer TEXT DEFAULT 'ICC Presiding Officer',
      filing_date TEXT DEFAULT CURRENT_DATE,
      resolution_date TEXT,
      recommendations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 19. DPDP Act Consent Records Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dpdp_consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT DEFAULT 'Granted',
      notice_version TEXT DEFAULT 'v2.1 (DPDP 2025)',
      consented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT DEFAULT '127.0.0.1',
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 20. Form 12BB Employee Tax Declarations (Section 192 TDS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_declarations_12bb (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      financial_year TEXT NOT NULL DEFAULT '2025-2026',
      regime TEXT DEFAULT 'New',
      sec_80c_amount REAL DEFAULT 0,
      sec_80d_amount REAL DEFAULT 0,
      hra_rent_paid_annual REAL DEFAULT 0,
      home_loan_interest_24b REAL DEFAULT 0,
      other_exemptions REAL DEFAULT 0,
      status TEXT DEFAULT 'Verified',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // 21. SaaS B2B GST Invoices (SAC 998314)
  db.exec(`
    CREATE TABLE IF NOT EXISTS saas_gst_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      company_id INTEGER NOT NULL,
      billing_month TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      seats_count INTEGER NOT NULL,
      sac_code TEXT DEFAULT '998314',
      taxable_amount REAL NOT NULL,
      cgst_rate REAL DEFAULT 9.0,
      cgst_amount REAL NOT NULL,
      sgst_rate REAL DEFAULT 9.0,
      sgst_amount REAL NOT NULL,
      igst_rate REAL DEFAULT 0.0,
      igst_amount REAL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'Paid',
      invoice_date TEXT DEFAULT CURRENT_DATE,
      egotech_gstin TEXT DEFAULT '27AAACE1234M1Z5',
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 17. Biometric Devices (Hardware Push SDK / ADMS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS biometric_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      device_name TEXT NOT NULL,
      device_model TEXT DEFAULT 'ZKTeco K40 / eSSL MB20',
      serial_number TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      port INTEGER DEFAULT 4370,
      location TEXT DEFAULT 'Headquarters Main Entrance',
      status TEXT DEFAULT 'Online',
      last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 18. Employee Digital Documents Locker (Aadhaar, PAN, Degree, Relieving)
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size TEXT DEFAULT '145 KB',
      verification_status TEXT DEFAULT 'Pending',
      verified_by INTEGER,
      verified_at DATETIME,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 19. Full & Final (FnF) Settlements (Payment of Gratuity Act 1972 Section 4(2))
  db.exec(`
    CREATE TABLE IF NOT EXISTS fnf_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      employee_id INTEGER NOT NULL,
      resignation_date DATE NOT NULL,
      last_working_day DATE NOT NULL,
      reason TEXT DEFAULT 'Resignation',
      basic_da_monthly REAL DEFAULT 0,
      gratuity_years REAL DEFAULT 0,
      gratuity_amount REAL DEFAULT 0,
      earned_leaves_days REAL DEFAULT 0,
      leave_encashment_amount REAL DEFAULT 0,
      notice_period_days INTEGER DEFAULT 30,
      notice_shortfall_days INTEGER DEFAULT 0,
      notice_pay_deduction REAL DEFAULT 0,
      pending_salary REAL DEFAULT 0,
      reimbursements REAL DEFAULT 0,
      total_payable REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      notes TEXT,
      settled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 20. Webhook & Communication Audit Logs (Slack, Teams, WhatsApp, SMS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER DEFAULT 1,
      channel TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status_code INTEGER DEFAULT 200,
      response_body TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // Safe runtime migrations for existing databases
  safeAddColumn('users', 'name', 'TEXT');
  safeAddColumn('users', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('users', 'status', "TEXT DEFAULT 'Active'");
  safeAddColumn('employees', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('departments', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('shifts', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('leave_types', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('leave_balances', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('leave_requests', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('attendance', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('salary_structures', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('payroll_batches', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('payslips', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('company_settings', 'company_id', 'INTEGER DEFAULT 1');
  safeAddColumn('companies', 'primary_color', "TEXT DEFAULT '#4f46e5'");
  safeAddColumn('companies', 'powered_by_text', "TEXT DEFAULT 'Powered by Egotech'");
  safeAddColumn('companies', 'powered_by_logo', "TEXT DEFAULT ''");
  safeAddColumn('companies', 'vendor_logo_url', "TEXT DEFAULT ''");
  safeAddColumn('companies', 'custom_tagline', "TEXT");

  // Geofencing columns
  safeAddColumn('companies', 'geofencing_enabled', 'INTEGER DEFAULT 0');
  safeAddColumn('companies', 'office_latitude', 'REAL DEFAULT 37.7749');
  safeAddColumn('companies', 'office_longitude', 'REAL DEFAULT -122.4194');
  safeAddColumn('companies', 'geofence_radius_meters', 'INTEGER DEFAULT 200');
  safeAddColumn('companies', 'office_name', "TEXT DEFAULT 'Headquarters Office'");

  // Attendance GPS tracking columns
  safeAddColumn('attendance', 'latitude', 'REAL');
  safeAddColumn('attendance', 'longitude', 'REAL');
  safeAddColumn('attendance', 'distance_meters', 'REAL');
  safeAddColumn('attendance', 'is_geofenced', 'INTEGER DEFAULT 1');

  // Payslip reimbursement & email delivery columns
  safeAddColumn('payslips', 'reimbursements', 'REAL DEFAULT 0');
  safeAddColumn('payslips', 'email_sent_at', 'DATETIME');

  // Indian Statutory & Labour Codes 2025/2026 columns
  safeAddColumn('employees', 'pan_number', 'TEXT');
  safeAddColumn('employees', 'aadhaar_masked', 'TEXT');
  safeAddColumn('employees', 'uan_number', 'TEXT');
  safeAddColumn('employees', 'esic_number', 'TEXT');
  safeAddColumn('employees', 'tax_regime', "TEXT DEFAULT 'New'");
  safeAddColumn('employees', 'work_state', "TEXT DEFAULT 'Maharashtra'");
  safeAddColumn('employees', 'epf_eligible', 'INTEGER DEFAULT 1');
  safeAddColumn('employees', 'esic_eligible', 'INTEGER DEFAULT 1');
  safeAddColumn('employees', 'pt_eligible', 'INTEGER DEFAULT 1');
  safeAddColumn('employees', 'dpdp_consent_status', "TEXT DEFAULT 'Consented'");
  safeAddColumn('employees', 'dpdp_consented_at', 'DATETIME');

  // Salary Structure statutory additions (Basic + DA 50% Rule)
  safeAddColumn('salary_structures', 'da', 'REAL DEFAULT 0');
  safeAddColumn('salary_structures', 'retaining_allowance', 'REAL DEFAULT 0');
  safeAddColumn('salary_structures', 'employer_pf', 'REAL DEFAULT 0');
  safeAddColumn('salary_structures', 'employer_esic', 'REAL DEFAULT 0');
  safeAddColumn('salary_structures', 'lwf_deduction', 'REAL DEFAULT 0');
  safeAddColumn('salary_structures', 'is_labour_code_compliant', 'INTEGER DEFAULT 1');

  // Payroll Batches (Maker-Checker Workflow & Statutory Summary)
  safeAddColumn('payroll_batches', 'checker_status', "TEXT DEFAULT 'Draft'");
  safeAddColumn('payroll_batches', 'submitted_by', 'INTEGER');
  safeAddColumn('payroll_batches', 'submitted_at', 'DATETIME');
  safeAddColumn('payroll_batches', 'reviewed_by', 'INTEGER');
  safeAddColumn('payroll_batches', 'reviewed_at', 'DATETIME');
  safeAddColumn('payroll_batches', 'checker_notes', 'TEXT');
  safeAddColumn('payroll_batches', 'total_employer_pf', 'REAL DEFAULT 0');
  safeAddColumn('payroll_batches', 'total_employer_esic', 'REAL DEFAULT 0');
  safeAddColumn('payroll_batches', 'total_pt', 'REAL DEFAULT 0');
  safeAddColumn('payroll_batches', 'total_tds', 'REAL DEFAULT 0');
  safeAddColumn('payroll_batches', 'bank_export_generated_at', 'DATETIME');
  safeAddColumn('payroll_batches', 'ecr_export_generated_at', 'DATETIME');

  // Payslips (Statutory Breakdown & Digital Signature Verification)
  safeAddColumn('payslips', 'da', 'REAL DEFAULT 0');
  safeAddColumn('payslips', 'employer_pf', 'REAL DEFAULT 0');
  safeAddColumn('payslips', 'employer_esic', 'REAL DEFAULT 0');
  safeAddColumn('payslips', 'lwf_deduction', 'REAL DEFAULT 0');
  safeAddColumn('payslips', 'tax_regime', "TEXT DEFAULT 'New'");
  safeAddColumn('payslips', 'pan_number', 'TEXT');
  safeAddColumn('payslips', 'uan_number', 'TEXT');
  safeAddColumn('payslips', 'aadhaar_masked', 'TEXT');
  safeAddColumn('payslips', 'digital_sign_hash', 'TEXT');
  safeAddColumn('payslips', 'statutory_retention_until', 'DATE');

  // Company Statutory Registrations & Legal DPA
  safeAddColumn('companies', 'gstin', "TEXT DEFAULT '27AAACE1234M1Z5'");
  safeAddColumn('companies', 'pan', "TEXT DEFAULT 'AAACE1234M'");
  safeAddColumn('companies', 'state', "TEXT DEFAULT 'Maharashtra'");
  safeAddColumn('companies', 'pf_code', "TEXT DEFAULT 'MH/BAN/0012345/000'");
  safeAddColumn('companies', 'esic_code', "TEXT DEFAULT '31000123450000101'");
  safeAddColumn('companies', 'pt_rc_no', "TEXT DEFAULT 'PTRC27123456'");
  safeAddColumn('companies', 'dpa_accepted_at', 'DATETIME');
  safeAddColumn('companies', 'icc_presiding_officer', "TEXT DEFAULT 'Adv. Meera Sen (Presiding Officer)'");
  safeAddColumn('companies', 'slack_webhook_url', 'TEXT');
  safeAddColumn('companies', 'whatsapp_notifications_enabled', 'INTEGER DEFAULT 1');
  safeAddColumn('companies', 'webhook_secret', 'TEXT');

  // Employee biometric hardware ID
  safeAddColumn('employees', 'biometric_id', 'TEXT');

  // Seed default biometric device if none exists
  try {
    const existingDevice = db.prepare('SELECT id FROM biometric_devices LIMIT 1').get();
    if (!existingDevice) {
      db.prepare(`
        INSERT INTO biometric_devices (company_id, device_name, device_model, serial_number, ip_address, port, location, status)
        VALUES 
          (1, 'Lobby Main Biometric Terminal', 'ZKTeco K40 / SilkBio-101', 'ZKT-9824-MUM-01', '192.168.1.120', 4370, 'HQ Reception Lobby', 'Online'),
          (1, 'Floor 3 Engineering Turnstile', 'eSSL MB20 Multi-Biometric', 'ESSL-4091-PUN-02', '192.168.1.125', 4370, 'Development Bay A', 'Online')
      `).run();
    }
  } catch (e) {
    // Non-fatal
  }

  // Seed sample employee documents if none exist
  try {
    const existingDocs = db.prepare('SELECT id FROM employee_documents LIMIT 1').get();
    if (!existingDocs) {
      const emp = db.prepare('SELECT id FROM employees LIMIT 1').get();
      if (emp) {
        db.prepare(`
          INSERT INTO employee_documents (company_id, employee_id, document_type, file_name, file_url, file_size, verification_status, verified_at)
          VALUES 
            (1, ?, 'Aadhaar Card', 'aadhaar_card_masked.pdf', '/uploads/documents/sample_aadhaar.pdf', '240 KB', 'Verified', CURRENT_TIMESTAMP),
            (1, ?, 'PAN Card', 'pan_card.pdf', '/uploads/documents/sample_pan.pdf', '180 KB', 'Verified', CURRENT_TIMESTAMP),
            (1, ?, 'Degree Certificate', 'btech_degree_cert.pdf', '/uploads/documents/sample_degree.pdf', '520 KB', 'Verified', CURRENT_TIMESTAMP)
        `).run(emp.id, emp.id, emp.id);
      }
    }
  } catch (e) {
    // Non-fatal
  }

  // Sanitize any corrupted/question-mark currency symbols (e.g. from non-UTF8 commands)
  try {
    db.prepare("UPDATE companies SET currency_symbol = '\u20B9' WHERE currency_code = 'INR' AND (currency_symbol = '?' OR currency_symbol IS NULL OR currency_symbol = '')").run();
    db.prepare("UPDATE expenses SET currency_symbol = '\u20B9' WHERE currency_symbol = '?' OR currency_symbol IS NULL OR currency_symbol = ''").run();
    db.prepare("UPDATE expenses SET receipt_url = '/api/receipts/boston-taxi-001.pdf' WHERE receipt_url LIKE '%docs.egotech.com%'").run();
  } catch (e) {
    // Non-fatal
  }
}

function safeAddColumn(tableName, columnName, columnDefinition) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasCol = cols.some((c) => c.name === columnName);
    if (!hasCol) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
    }
  } catch (err) {
    // Column already exists or table not ready
  }
}

export default db;
