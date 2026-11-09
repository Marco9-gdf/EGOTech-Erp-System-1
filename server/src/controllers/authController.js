import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';

export function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const userStmt = db.prepare(`
      SELECT u.*, e.first_name, e.last_name, e.employee_code, e.department_id, e.designation, e.avatar_url,
             d.name as department_name, c.name as company_name, c.plan as company_plan,
             c.currency_symbol, c.currency_code, c.logo_url as company_logo_url,
             c.primary_color, c.powered_by_text, c.powered_by_logo, c.vendor_logo_url, c.custom_tagline
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE LOWER(u.email) = ?
    `);
    const user = userStmt.get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    if (user.status && user.status !== 'Active') {
      return res.status(403).json({ error: 'This account has been deactivated or suspended. Please contact support.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const token = generateToken(user);
    const displayName = user.name || (user.first_name ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0]);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status || 'Active',
        company_id: user.company_id || 1,
        company_name: user.company_name || 'Egotech Technologies',
        company_plan: user.company_plan || 'Enterprise',
        company_logo_url: user.company_logo_url || '',
        currency_symbol: (user.currency_symbol && user.currency_symbol !== '?') ? user.currency_symbol : (user.currency_code === 'INR' ? '₹' : '$'),
        currency_code: user.currency_code || (user.currency_symbol === '₹' ? 'INR' : 'USD'),
        primary_color: user.primary_color || '#0078d4',
        powered_by_text: user.powered_by_text || 'Powered by Egotech',
        powered_by_logo: user.powered_by_logo || '',
        vendor_logo_url: user.vendor_logo_url || '',
        custom_tagline: user.custom_tagline || '',
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        name: displayName,
        employee_code: user.employee_code,
        designation: user.designation || (user.role === 'owner' ? 'SaaS Platform Owner' : user.role === 'admin' ? 'Company Administrator' : 'Staff'),
        department_name: user.department_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication: ' + err.message });
  }
}

export function getMe(req, res) {
  try {
    const userStmt = db.prepare(`
      SELECT u.id, u.email, u.role, u.employee_id, u.company_id, u.name as custom_name, u.status,
             e.first_name, e.last_name, e.employee_code, e.department_id, e.designation,
             e.joining_date, e.phone, e.avatar_url, e.bank_name, e.bank_account_no, e.tax_id,
             d.name as department_name, s.name as shift_name,
             c.name as company_name, c.plan as company_plan, c.currency_symbol, c.currency_code,
             c.logo_url as company_logo_url, c.primary_color, c.powered_by_text,
             c.powered_by_logo, c.vendor_logo_url, c.custom_tagline
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `);
    const user = userStmt.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const displayName = user.custom_name || (user.first_name ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0]);

    res.json({
      user: {
        ...user,
        name: displayName,
        company_name: user.company_name || 'Egotech Technologies',
        company_logo_url: user.company_logo_url || '',
        currency_symbol: (user.currency_symbol && user.currency_symbol !== '?') ? user.currency_symbol : (user.currency_code === 'INR' ? '₹' : '$'),
        currency_code: user.currency_code || (user.currency_symbol === '₹' ? 'INR' : 'USD'),
        primary_color: user.primary_color || '#0078d4',
        powered_by_text: user.powered_by_text || 'Powered by Egotech',
        powered_by_logo: user.powered_by_logo || '',
        vendor_logo_url: user.vendor_logo_url || '',
        custom_tagline: user.custom_tagline || '',
        designation: user.designation || (user.role === 'owner' ? 'SaaS Platform Owner' : user.role === 'admin' ? 'Company Administrator' : 'Staff'),
      },
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile: ' + err.message });
  }
}

export function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashed, req.user.id);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('updatePassword error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
}
