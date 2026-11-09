import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

export function getCompanies(req, res) {
  try {
    const includeOwner = req.query.include_owner === 'true';
    let query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.status = 'Active') as employee_count,
             (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.status = 'Active') as user_count,
             (SELECT u.name FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_name,
             (SELECT u.email FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_email
      FROM companies c
    `;
    if (!includeOwner) {
      query += ' WHERE c.id != 1';
    }
    query += ' ORDER BY c.id DESC';

    const companies = db.prepare(query).all();

    res.json({ companies });
  } catch (err) {
    console.error('getCompanies error:', err);
    res.status(500).json({ error: 'Failed to fetch client companies: ' + err.message });
  }
}

export function getCompanyById(req, res) {
  try {
    const id = req.params.id;
    const company = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.status = 'Active') as employee_count
      FROM companies c
      WHERE c.id = ?
    `).get(id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const admins = db.prepare(`
      SELECT id, name, email, role, status, created_at
      FROM users
      WHERE company_id = ? AND role = 'admin'
    `).all(id);

    const departments = db.prepare(`
      SELECT d.*, COUNT(e.id) as staff_count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      WHERE d.company_id = ?
      GROUP BY d.id
    `).all(id);

    res.json({ company, admins, departments });
  } catch (err) {
    console.error('getCompanyById error:', err);
    res.status(500).json({ error: 'Failed to get company details: ' + err.message });
  }
}

export function createCompany(req, res) {
  try {
    const {
      name,
      code,
      email,
      phone,
      address,
      currency_symbol = '$',
      currency_code = 'USD',
      plan = 'Enterprise',
      max_employees = 100,
      logo_url = '',
      primary_color = '#0078d4',
      powered_by_text = 'Powered by Egotech',
      powered_by_logo = '',
      vendor_logo_url = '',
      custom_tagline = '',
      admin_name,
      admin_email,
      admin_password,
    } = req.body;

    if (!name || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Company name, Administrator email, and Administrator password are required.' });
    }

    // Auto-generate company code if missing
    const companyCode = (code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()) + Math.floor(100 + Math.random() * 900);

    // Check if administrator email already exists
    const cleanAdminEmail = admin_email.toLowerCase().trim();
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanAdminEmail);
    if (existingUser) {
      return res.status(400).json({ error: `An account with email "${cleanAdminEmail}" already exists. Please choose a different email.` });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Insert Company
      const insertCompanyStmt = db.prepare(`
        INSERT INTO companies (
          name, code, email, phone, address, currency_symbol, currency_code, plan, max_employees, status,
          logo_url, primary_color, powered_by_text, powered_by_logo, vendor_logo_url, custom_tagline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?)
      `);

      insertCompanyStmt.run(
        name.trim(),
        companyCode,
        email || null,
        phone || null,
        address || null,
        currency_symbol,
        currency_code,
        plan,
        Number(max_employees) || 100,
        logo_url || null,
        primary_color || '#0078d4',
        powered_by_text || 'Powered by Egotech',
        powered_by_logo || null,
        vendor_logo_url || null,
        custom_tagline || null
      );

      const newCompany = db.prepare('SELECT * FROM companies WHERE code = ?').get(companyCode);
      const companyId = newCompany.id;

      // 2. Insert Administrator User
      const passwordHash = bcrypt.hashSync(admin_password, 10);
      db.prepare(`
        INSERT INTO users (company_id, name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, 'admin', 'Active')
      `).run(
        companyId,
        admin_name ? admin_name.trim() : `${name} Administrator`,
        cleanAdminEmail,
        passwordHash
      );

      const adminUser = db.prepare('SELECT id, name, email, role, status FROM users WHERE email = ?').get(cleanAdminEmail);

      // 3. Provision Default Departments for the client
      const defaultDepts = [
        { name: 'Management & Operations', code: 'OPS' },
        { name: 'Engineering & Technology', code: 'ENG' },
        { name: 'Human Resources', code: 'HR' },
        { name: 'Finance & Sales', code: 'FIN' },
      ];
      const insertDept = db.prepare('INSERT INTO departments (company_id, name, code) VALUES (?, ?, ?)');
      defaultDepts.forEach((d) => insertDept.run(companyId, d.name, d.code));

      // 4. Provision Default Shifts
      const insertShift = db.prepare(`
        INSERT INTO shifts (company_id, name, start_time, end_time, grace_period_minutes, half_day_hours, full_day_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertShift.run(companyId, 'Standard Day Shift', '09:00:00', '18:00:00', 15, 4.0, 8.0);
      insertShift.run(companyId, 'Morning Shift', '08:00:00', '17:00:00', 10, 4.0, 8.0);

      // 5. Provision Default Leave Types
      const insertLT = db.prepare(`
        INSERT INTO leave_types (company_id, name, code, default_days_per_year, is_paid, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLT.run(companyId, 'Paid Annual Leave', 'PL', 18, 1, '#3b82f6');
      insertLT.run(companyId, 'Sick Leave', 'SL', 10, 1, '#ef4444');
      insertLT.run(companyId, 'Casual Leave', 'CL', 7, 1, '#10b981');
      insertLT.run(companyId, 'Unpaid Leave (LOP)', 'LOP', 30, 0, '#f59e0b');

      db.exec('COMMIT;');

      res.status(201).json({
        message: 'Client organization and Administrator account provisioned successfully!',
        company: newCompany,
        administrator: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('createCompany error:', err);
    res.status(500).json({ error: 'Failed to create client organization: ' + err.message });
  }
}

export function updateCompany(req, res) {
  try {
    const id = req.params.id;
    const {
      name,
      email,
      phone,
      address,
      currency_symbol,
      currency_code,
      plan,
      status,
      max_employees,
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
        plan = COALESCE(?, plan),
        status = COALESCE(?, status),
        max_employees = COALESCE(?, max_employees),
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
      plan ?? null,
      status ?? null,
      max_employees != null ? Number(max_employees) : null,
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
      id
    );

    const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);

    res.json({ message: 'Company details and branding updated successfully.', company: updated });
  } catch (err) {
    console.error('updateCompany error:', err);
    res.status(500).json({ error: 'Failed to update company: ' + err.message });
  }
}

export function registerPublicCompany(req, res) {
  try {
    const {
      company_name,
      admin_name,
      admin_email,
      admin_password,
      plan = 'Pro',
      currency_symbol = '$',
      currency_code = 'USD',
    } = req.body;

    if (!company_name || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Company name, admin email, and password are required.' });
    }

    if (admin_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = admin_email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists. Please sign in or use a different email.` });
    }

    const maxEmployees = plan === 'Starter' ? 25 : plan === 'Enterprise' ? 500 : 100;
    const companyCode = company_name.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() + Math.floor(100 + Math.random() * 900);

    db.exec('BEGIN TRANSACTION;');
    try {
      const insertCompany = db.prepare(`
        INSERT INTO companies (
          name, code, email, currency_symbol, currency_code, plan, max_employees, status,
          primary_color, powered_by_text, custom_tagline,
          geofencing_enabled, office_name, geofence_radius_meters
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', '#4f46e5', 'Powered by Egotech', 'Modern HR & Payroll Workspace', 0, 'Headquarters', 200)
      `);

      insertCompany.run(
        company_name.trim(),
        companyCode,
        cleanEmail,
        currency_symbol,
        currency_code,
        plan,
        maxEmployees
      );

      const newCompany = db.prepare('SELECT * FROM companies WHERE code = ?').get(companyCode);
      const companyId = newCompany.id;

      const passwordHash = bcrypt.hashSync(admin_password, 10);
      db.prepare(`
        INSERT INTO users (company_id, name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, 'admin', 'Active')
      `).run(
        companyId,
        admin_name ? admin_name.trim() : `${company_name.trim()} Admin`,
        cleanEmail,
        passwordHash
      );

      const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

      // Default Departments
      const defaultDepts = [
        { name: 'Executive & Operations', code: 'OPS' },
        { name: 'Engineering & Tech', code: 'ENG' },
        { name: 'People & HR', code: 'HR' },
        { name: 'Finance & Sales', code: 'FIN' },
      ];
      const insertDept = db.prepare('INSERT INTO departments (company_id, name, code) VALUES (?, ?, ?)');
      defaultDepts.forEach((d) => insertDept.run(companyId, d.name, d.code));

      // Default Shifts
      const insertShift = db.prepare(`
        INSERT INTO shifts (company_id, name, start_time, end_time, grace_period_minutes, half_day_hours, full_day_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertShift.run(companyId, 'Standard Day Shift', '09:00:00', '18:00:00', 15, 4.0, 8.0);
      insertShift.run(companyId, 'Flexible Shift', '10:00:00', '19:00:00', 30, 4.0, 8.0);

      // Default Leave Types
      const insertLT = db.prepare(`
        INSERT INTO leave_types (company_id, name, code, default_days_per_year, is_paid, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertLT.run(companyId, 'Paid Annual Leave', 'PL', 20, 1, '#3b82f6');
      insertLT.run(companyId, 'Sick Leave', 'SL', 10, 1, '#ef4444');
      insertLT.run(companyId, 'Casual Leave', 'CL', 8, 1, '#10b981');
      insertLT.run(companyId, 'Unpaid Leave (LOP)', 'LOP', 30, 0, '#f59e0b');

      db.exec('COMMIT;');

      const token = generateToken(adminUser);

      res.status(201).json({
        message: 'Congratulations! Your organization workspace and 14-day free trial are ready.',
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          company_id: companyId,
          company_name: newCompany.name,
          company_plan: newCompany.plan,
          currency_symbol: newCompany.currency_symbol,
          currency_code: newCompany.currency_code,
          primary_color: newCompany.primary_color,
          powered_by_text: newCompany.powered_by_text,
          status: adminUser.status,
        },
      });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('registerPublicCompany error:', err);
    res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
  }
}

export function deleteCompany(req, res) {
  try {
    const id = Number(req.params.id);
    if (id === 1) {
      return res.status(400).json({ error: 'Cannot deactivate default system organization (Egotech).' });
    }

    const permanent = req.query.permanent === 'true';
    if (permanent) {
      db.prepare('DELETE FROM leave_balances WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ?)').run(id);
      db.prepare('DELETE FROM payslips WHERE batch_id IN (SELECT id FROM payroll_batches WHERE company_id = ?)').run(id);
      db.prepare('DELETE FROM payroll_batches WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ?)').run(id);
      db.prepare('DELETE FROM leave_requests WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ?)').run(id);
      db.prepare('DELETE FROM expenses WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM employees WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM departments WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM shifts WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM leave_types WHERE company_id = ?').run(id);
      db.prepare('DELETE FROM companies WHERE id = ?').run(id);
      return res.json({ message: 'Company and all associated records permanently purged.' });
    }

    db.prepare("UPDATE companies SET status = 'Suspended' WHERE id = ?").run(id);
    db.prepare("UPDATE users SET status = 'Suspended' WHERE company_id = ?").run(id);

    res.json({ message: 'Company and its associated accounts suspended successfully.' });
  } catch (err) {
    console.error('deleteCompany error:', err);
    res.status(500).json({ error: 'Failed to suspend company: ' + err.message });
  }
}

export function getPlatformStats(req, res) {
  try {
    const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get().count || 0;
    const employeeCount = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'").get().count || 0;
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count || 0;
    const activeClients = db.prepare("SELECT COUNT(*) as count FROM companies WHERE status = 'Active'").get().count || 0;

    const plans = db.prepare(`
      SELECT plan, COUNT(*) as count
      FROM companies
      GROUP BY plan
    `).all();

    const recentCompanies = db.prepare(`
      SELECT c.id, c.name, c.plan, c.status, c.created_at,
             (SELECT u.email FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_email,
             (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id) as staff_count
      FROM companies c
      ORDER BY c.id DESC
      LIMIT 5
    `).all();

    res.json({
      total_companies: companyCount,
      active_clients: activeClients,
      total_employees: employeeCount,
      total_users: userCount,
      plan_breakdown: plans,
      recent_clients: recentCompanies,
    });
  } catch (err) {
    console.error('getPlatformStats error:', err);
    res.status(500).json({ error: 'Failed to load platform stats: ' + err.message });
  }
}

import { createBackup, listBackups, getBackupFilePath, restoreBackup } from '../services/backupService.js';
import { dispatchWebhook, getWebhookLogs } from '../services/webhookService.js';

export function listBackupsHandler(req, res) {
  try {
    const backups = listBackups();
    res.json({ backups });
  } catch (err) {
    console.error('listBackupsHandler error:', err);
    res.status(500).json({ error: 'Failed to list database backups: ' + err.message });
  }
}

export function createBackupHandler(req, res) {
  try {
    const { notes } = req.body;
    const backup = createBackup(notes || 'Manual Snapshot via Settings Console');
    res.json({ message: 'Database backup created successfully.', backup });
  } catch (err) {
    console.error('createBackupHandler error:', err);
    res.status(500).json({ error: 'Failed to create database backup: ' + err.message });
  }
}

export function downloadBackupHandler(req, res) {
  try {
    const { fileName } = req.params;
    const filePath = getBackupFilePath(fileName);
    res.download(filePath, fileName);
  } catch (err) {
    console.error('downloadBackupHandler error:', err);
    res.status(404).json({ error: err.message });
  }
}

export function restoreBackupHandler(req, res) {
  try {
    const { fileName } = req.params;
    const result = restoreBackup(fileName);
    res.json(result);
  } catch (err) {
    console.error('restoreBackupHandler error:', err);
    res.status(500).json({ error: 'Failed to restore database: ' + err.message });
  }
}

export async function testWebhookHandler(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    await dispatchWebhook(companyId, 'test.ping', {
      message: 'This is a test notification from the Egotech Enterprise Webhook Dispatcher.',
    });
    res.json({ message: 'Test webhook notification dispatched to configured channels.' });
  } catch (err) {
    console.error('testWebhookHandler error:', err);
    res.status(500).json({ error: 'Failed to dispatch test webhook: ' + err.message });
  }
}

export function getWebhookLogsHandler(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const logs = getWebhookLogs(companyId);
    res.json({ logs });
  } catch (err) {
    console.error('getWebhookLogsHandler error:', err);
    res.status(500).json({ error: 'Failed to fetch webhook logs: ' + err.message });
  }
}
