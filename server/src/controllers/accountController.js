import bcrypt from 'bcryptjs';
import db from '../config/database.js';

export function getAccounts(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.company_id, u.created_at,
             c.name as company_name, c.plan as company_plan,
             e.id as employee_id, e.employee_code, e.designation, e.department_id,
             d.name as department_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // If not owner, filter by administrator's company
    if (!isOwner) {
      query += ' AND u.company_id = ?';
      params.push(userCompanyId);
    }

    query += ' ORDER BY u.id DESC';

    const accounts = db.prepare(query).all(...params);

    // Format display names
    const formatted = accounts.map((acc) => ({
      ...acc,
      display_name: acc.name || (acc.employee_code ? `${acc.employee_code} (${acc.email.split('@')[0]})` : acc.email.split('@')[0]),
    }));

    res.json({ accounts: formatted });
  } catch (err) {
    console.error('getAccounts error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts: ' + err.message });
  }
}

export function createAccount(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;

    const {
      name,
      email,
      password,
      role = 'employee',
      company_id,
      employee_id,
      status = 'Active',
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: `An account with email "${cleanEmail}" already exists.` });
    }

    // Role safety: only owner can create another owner
    let targetRole = role.toLowerCase();
    if (targetRole === 'owner' && !isOwner) {
      targetRole = 'admin';
    }

    // Company assignment: Owner can select company; Admin is locked to their own company
    const targetCompanyId = isOwner && company_id ? Number(company_id) : userCompanyId;

    const hash = bcrypt.hashSync(password, 10);
    const displayName = name ? name.trim() : cleanEmail.split('@')[0];

    db.prepare(`
      INSERT INTO users (company_id, employee_id, name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetCompanyId,
      employee_id ? Number(employee_id) : null,
      displayName,
      cleanEmail,
      hash,
      targetRole,
      status || 'Active'
    );

    const newUser = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.company_id, u.created_at,
             c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE LOWER(u.email) = ?
    `).get(cleanEmail);

    res.status(201).json({
      message: 'User account created successfully.',
      account: newUser,
    });
  } catch (err) {
    console.error('createAccount error:', err);
    res.status(500).json({ error: 'Failed to create user account: ' + err.message });
  }
}

export function resetPassword(req, res) {
  try {
    const id = req.params.id;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Permission check: Admin cannot reset Owner's password
    const isOwner = req.user.role === 'owner';
    if (!isOwner) {
      if (user.role === 'owner') {
        return res.status(403).json({ error: 'Cannot modify Owner account.' });
      }
      if (user.company_id !== req.currentUser.company_id) {
        return res.status(403).json({ error: 'Access denied to accounts outside your company.' });
      }
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);

    res.json({ message: `Password for ${user.email} updated successfully.` });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
}

export function updateAccountRole(req, res) {
  try {
    const id = req.params.id;
    const { role } = req.body;

    if (!['admin', 'hr', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, hr, or employee.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'owner' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Cannot alter Owner role.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    res.json({ message: `Account role updated to ${role}.` });
  } catch (err) {
    console.error('updateAccountRole error:', err);
    res.status(500).json({ error: 'Failed to update account role: ' + err.message });
  }
}

export function updateAccountStatus(req, res) {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active or Suspended.' });
    }

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot suspend your own logged-in account.' });
    }

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    res.json({ message: `Account status updated to ${status}.` });
  } catch (err) {
    console.error('updateAccountStatus error:', err);
    res.status(500).json({ error: 'Failed to update account status: ' + err.message });
  }
}

export function deleteAccount(req, res) {
  try {
    const id = req.params.id;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.role === 'owner') {
      return res.status(403).json({ error: 'Platform Owner account cannot be deleted.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: `Account ${user.email} deleted successfully.` });
  } catch (err) {
    console.error('deleteAccount error:', err);
    res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
}
