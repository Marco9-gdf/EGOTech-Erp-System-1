import db from '../config/database.js';
import { sendLeaveNotificationEmail } from '../services/emailService.js';
import { dispatchWebhook } from '../services/webhookService.js';

export function getLeaveTypes(req, res) {
  try {
    const types = db.prepare('SELECT * FROM leave_types ORDER BY id ASC').all();
    res.json({ leave_types: types });
  } catch (err) {
    console.error('getLeaveTypes error:', err);
    res.status(500).json({ error: 'Failed to fetch leave types.' });
  }
}

export function getMyBalances(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }

    const currentYear = new Date().getFullYear();
    const balances = db.prepare(`
      SELECT lb.*, lt.name as leave_type_name, lt.code, lt.is_paid, lt.color
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ?
      ORDER BY lt.id ASC
    `).all(employeeId, currentYear);

    res.json({ balances, year: currentYear });
  } catch (err) {
    console.error('getMyBalances error:', err);
    res.status(500).json({ error: 'Failed to fetch leave balances.' });
  }
}

export function applyLeave(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }

    const { leave_type_id, start_date, end_date, days_count, reason } = req.body;
    if (!leave_type_id || !start_date || !end_date || !days_count || !reason) {
      return res.status(400).json({ error: 'Leave type, start date, end date, days count, and reason are required.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date.' });
    }

    // Check balance for paid leaves
    const currentYear = start.getFullYear();
    const balance = db.prepare(`
      SELECT lb.*, lt.is_paid, lt.name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.leave_type_id = ? AND lb.year = ?
    `).get(employeeId, leave_type_id, currentYear);

    const count = Number(days_count);
    if (balance && balance.is_paid) {
      const remaining = balance.total_days - balance.used_days;
      if (count > remaining) {
        return res.status(400).json({
          error: `Insufficient leave balance for ${balance.name}. Remaining: ${remaining} days, Requested: ${count} days.`,
        });
      }
    }

    db.prepare(`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, days_count, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `).run(employeeId, leave_type_id, start_date, end_date, count, reason.trim());

    // Send async email notification
    try {
      const newLeave = db.prepare('SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY id DESC LIMIT 1').get(employeeId);
      const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) || {};
      const companyId = req.currentUser.company_id || employee.company_id || 1;
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};
      sendLeaveNotificationEmail({ leaveRequest: newLeave, company, employee, action: 'SUBMITTED' }).catch(() => {});
    } catch (eErr) {
      console.warn('Leave email dispatch notice:', eErr.message);
    }

    // Dispatch real-time webhook notification
    try {
      const companyId = req.currentUser.company_id || 1;
      dispatchWebhook(companyId, 'leave.applied', {
        message: `New leave request submitted: ${days_count} day(s) from ${start_date} to ${end_date} (Reason: ${reason || 'Personal'})`,
      });
    } catch (whErr) {
      // non-blocking
    }

    res.status(201).json({ message: 'Leave application submitted successfully for review.' });
  } catch (err) {
    console.error('applyLeave error:', err);
    res.status(500).json({ error: 'Failed to submit leave application.' });
  }
}

export function getLeaveRequests(req, res) {
  try {
    const isHrOrAdmin = ['admin', 'hr'].includes(req.user.role);
    const { status, employee_id, department_id } = req.query;

    let query = `
      SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.is_paid, lt.color,
             e.first_name, e.last_name, e.employee_code, e.avatar_url,
             d.name as department_name,
             u.email as reviewer_email
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (!isHrOrAdmin) {
      query += ' AND lr.employee_id = ?';
      params.push(req.currentUser.employee_id);
    } else {
      if (employee_id) {
        query += ' AND lr.employee_id = ?';
        params.push(employee_id);
      }
      if (department_id) {
        query += ' AND e.department_id = ?';
        params.push(department_id);
      }
    }

    if (status) {
      query += ' AND lr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY lr.id DESC';

    const requests = db.prepare(query).all(...params);
    res.json({ requests });
  } catch (err) {
    console.error('getLeaveRequests error:', err);
    res.status(500).json({ error: 'Failed to fetch leave requests.' });
  }
}

export function reviewLeave(req, res) {
  try {
    const id = req.params.id;
    const { status, review_notes } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Approved or Rejected.' });
    }

    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: `This leave request is already ${leave.status}.` });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Update request status
      db.prepare(`
        UPDATE leave_requests SET
          status = ?,
          reviewed_by = ?,
          review_notes = ?
        WHERE id = ?
      `).run(status, req.user.id, review_notes || null, id);

      if (status === 'Approved') {
        const leaveYear = new Date(leave.start_date).getFullYear();

        // 2. Deduct from leave balance
        db.prepare(`
          UPDATE leave_balances SET
            used_days = used_days + ?
          WHERE employee_id = ? AND leave_type_id = ? AND year = ?
        `).run(leave.days_count, leave.employee_id, leave.leave_type_id, leaveYear);

        // 3. Mark attendance table for each day in range as 'On Leave'
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const cur = new Date(start);

        const upsertAttendance = db.prepare(`
          INSERT INTO attendance (employee_id, date, status, notes)
          VALUES (?, ?, 'On Leave', ?)
          ON CONFLICT(employee_id, date) DO UPDATE SET
            status = 'On Leave',
            notes = excluded.notes
        `);

        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          // Check if weekday
          const day = cur.getDay();
          if (day !== 0 && day !== 6) {
            upsertAttendance.run(leave.employee_id, dateStr, `Approved Leave: ${leave.reason}`);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      db.exec('COMMIT;');

      // Send async status update notification
      try {
        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(leave.employee_id) || {};
        const companyId = req.currentUser.company_id || employee.company_id || 1;
        const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};
        sendLeaveNotificationEmail({
          leaveRequest: { ...leave, status, review_notes },
          company,
          employee,
          action: status.toUpperCase(),
          reviewerName: req.currentUser.name || 'Management',
        }).catch(() => {});

        dispatchWebhook(companyId, status === 'Approved' ? 'leave.approved' : 'leave.rejected', {
          message: `Leave request for employee ${employee.first_name || ''} ${employee.last_name || ''} was ${status.toLowerCase()} by ${req.currentUser.name || 'Management'}. (${leave.days_count} days: ${leave.start_date} to ${leave.end_date})`,
          phone: employee.phone,
        });
      } catch (eErr) {
        console.warn('Leave review email dispatch notice:', eErr.message);
      }

      res.json({ message: `Leave request ${status.toLowerCase()} successfully.` });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('reviewLeave error:', err);
    res.status(500).json({ error: 'Failed to process leave review: ' + err.message });
  }
}
