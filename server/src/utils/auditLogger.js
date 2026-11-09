import db from '../config/database.js';

/**
 * 🛡️ CERT-In Mandated 180-Day ICT System Audit Logger
 * Logs action, user, timestamp (IST), IP address, and resource.
 */
export function logAuditEvent({
  companyId = 1,
  userId = null,
  userName = 'System',
  userRole = 'system',
  action,
  resource = '',
  details = '',
  ipAddress = '127.0.0.1',
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (
        company_id, user_id, user_name, user_role,
        action, resource, details, ip_address, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      companyId,
      userId,
      userName,
      userRole,
      action,
      resource,
      typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress
    );
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}
