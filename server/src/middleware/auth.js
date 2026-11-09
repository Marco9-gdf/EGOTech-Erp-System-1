import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'payroll-secret-super-secure-key-2026';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      company_id: user.company_id || 1,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Attach fresh user info with employee and company profile if available
    const userStmt = db.prepare(`
      SELECT u.id, u.email, u.role, u.employee_id, u.company_id, u.name as custom_name, u.status,
             e.first_name, e.last_name, e.employee_code, e.department_id, e.designation, e.avatar_url,
             c.name as company_name, c.plan as company_plan, c.currency_symbol, c.currency_code
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `);
    const user = userStmt.get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    if (user.status && user.status !== 'Active') {
      return res.status(403).json({ error: 'Account has been deactivated or suspended.' });
    }

    req.currentUser = {
      ...user,
      name: user.custom_name || (user.first_name ? `${user.first_name} ${user.last_name}` : user.email.split('@')[0]),
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    // Owner has superadmin access to everything!
    if (req.user.role === 'owner') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}
