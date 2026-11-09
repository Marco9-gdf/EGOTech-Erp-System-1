import db from '../config/database.js';
import { sendExpenseNotificationEmail } from '../services/emailService.js';
import { dispatchWebhook } from '../services/webhookService.js';

export function getExpenses(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const isHrOrAdmin = ['owner', 'admin', 'hr'].includes(req.currentUser.role);
    const { status, category, employee_id } = req.query;

    let query = `
      SELECT ex.*,
             e.first_name, e.last_name, e.employee_code, e.avatar_url,
             d.name as department_name,
             u.name as reviewer_name
      FROM expenses ex
      JOIN employees e ON ex.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON ex.reviewed_by = u.id
      WHERE ex.company_id = ?
    `;
    const params = [companyId];

    if (!isHrOrAdmin) {
      query += ` AND ex.employee_id = ?`;
      params.push(req.currentUser.employee_id);
    } else if (employee_id) {
      query += ` AND ex.employee_id = ?`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND ex.status = ?`;
      params.push(status);
    }

    if (category) {
      query += ` AND ex.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY ex.expense_date DESC, ex.id DESC`;

    const expenses = db.prepare(query).all(...params);

    // Calculate Summary Stats
    const statsQuery = isHrOrAdmin
      ? `SELECT
           SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as pending_total,
           SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END) as approved_total,
           SUM(CASE WHEN status = 'Reimbursed' THEN amount ELSE 0 END) as reimbursed_total,
           COUNT(*) as total_count
         FROM expenses WHERE company_id = ?`
      : `SELECT
           SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as pending_total,
           SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END) as approved_total,
           SUM(CASE WHEN status = 'Reimbursed' THEN amount ELSE 0 END) as reimbursed_total,
           COUNT(*) as total_count
         FROM expenses WHERE company_id = ? AND employee_id = ?`;

    const statsParams = isHrOrAdmin ? [companyId] : [companyId, req.currentUser.employee_id];
    const stats = db.prepare(statsQuery).get(...statsParams) || {};

    res.json({
      expenses,
      stats: {
        pending_total: stats.pending_total || 0,
        approved_total: stats.approved_total || 0,
        reimbursed_total: stats.reimbursed_total || 0,
        total_count: stats.total_count || 0,
      },
    });
  } catch (err) {
    console.error('getExpenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expense claims: ' + err.message });
  }
}

export function createExpense(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const {
      category,
      amount,
      expense_date,
      description,
      receipt_url,
      employee_id,
    } = req.body;

    const isHrOrAdmin = ['owner', 'admin', 'hr'].includes(req.currentUser.role);
    const targetEmpId = (isHrOrAdmin && employee_id) ? Number(employee_id) : req.currentUser.employee_id;

    if (!targetEmpId) {
      return res.status(400).json({ error: 'User is not linked to an employee profile.' });
    }

    if (!category || !amount || Number(amount) <= 0 || !expense_date) {
      return res.status(400).json({ error: 'Category, valid positive amount, and expense date are required.' });
    }

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};
    const currencySymbol = company.currency_symbol || '$';

    const insertStmt = db.prepare(`
      INSERT INTO expenses (
        company_id, employee_id, category, amount, currency_symbol,
        expense_date, description, receipt_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `);

    insertStmt.run(
      companyId,
      targetEmpId,
      category,
      Number(amount),
      currencySymbol,
      expense_date,
      description || null,
      receipt_url || null
    );

    const newExpense = db.prepare('SELECT * FROM expenses WHERE company_id = ? ORDER BY id DESC LIMIT 1').get(companyId);
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(targetEmpId) || {};

    // Trigger async notification email
    sendExpenseNotificationEmail({
      expense: newExpense,
      company,
      employee,
      action: 'SUBMITTED',
    }).catch(() => {});

    res.status(201).json({
      message: 'Expense claim submitted successfully.',
      expense: newExpense,
    });
  } catch (err) {
    console.error('createExpense error:', err);
    res.status(500).json({ error: 'Failed to submit expense claim: ' + err.message });
  }
}

export function reviewExpense(req, res) {
  try {
    const id = req.params.id;
    const { status, review_notes } = req.body;
    const companyId = req.currentUser.company_id || 1;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "Approved" or "Rejected".' });
    }

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND company_id = ?').get(id, companyId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense claim not found.' });
    }

    if (expense.status === 'Reimbursed') {
      return res.status(400).json({ error: 'Cannot modify an expense that has already been reimbursed in payroll.' });
    }

    db.prepare(`
      UPDATE expenses SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.currentUser.id, review_notes || null, id);

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(expense.employee_id) || {};

    // Trigger status update email & webhooks
    sendExpenseNotificationEmail({
      expense: updated,
      company,
      employee,
      action: status.toUpperCase(),
      reviewerName: req.currentUser.name,
    }).catch(() => {});

    try {
      dispatchWebhook(companyId, status === 'Approved' ? 'expense.approved' : 'expense.rejected', {
        message: `Expense claim "${updated.title}" for ${updated.currency_symbol || '₹'}${updated.amount} was ${status.toLowerCase()} by ${req.currentUser.name}.`,
        phone: employee.phone,
      });
    } catch (whErr) {
      // non-blocking
    }

    res.json({
      message: `Expense claim marked as ${status}.`,
      expense: updated,
    });
  } catch (err) {
    console.error('reviewExpense error:', err);
    res.status(500).json({ error: 'Failed to review expense: ' + err.message });
  }
}

export function deleteExpense(req, res) {
  try {
    const id = req.params.id;
    const companyId = req.currentUser.company_id || 1;
    const isHrOrAdmin = ['owner', 'admin', 'hr'].includes(req.currentUser.role);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND company_id = ?').get(id, companyId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense claim not found.' });
    }

    if (!isHrOrAdmin && expense.employee_id !== req.currentUser.employee_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (expense.status !== 'Pending') {
      return res.status(400).json({ error: 'Cannot delete an expense that is already Approved or Reimbursed.' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    res.json({ message: 'Expense claim deleted successfully.' });
  } catch (err) {
    console.error('deleteExpense error:', err);
    res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
  }
}
