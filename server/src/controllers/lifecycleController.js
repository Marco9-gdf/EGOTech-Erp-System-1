import db from '../config/database.js';
import { calculateFnFSettlement } from '../services/fnfCalculator.js';
import { logAuditEvent } from '../utils/auditLogger.js';

// ==========================================
// 1. Digital Document Locker Controllers
// ==========================================

export function getEmployeeDocuments(req, res) {
  try {
    const { employeeId } = req.params;
    const companyId = req.currentUser.company_id || 1;

    // Check permissions
    if (req.currentUser.role === 'employee' && Number(req.currentUser.employee_id) !== Number(employeeId)) {
      return res.status(403).json({ error: 'Access denied to other employee documents.' });
    }

    const documents = db.prepare(`
      SELECT ed.*, u.name as verifier_name
      FROM employee_documents ed
      LEFT JOIN users u ON ed.verified_by = u.id
      WHERE ed.employee_id = ? AND ed.company_id = ?
      ORDER BY ed.id DESC
    `).all(employeeId, companyId);

    res.json({ documents });
  } catch (err) {
    console.error('getEmployeeDocuments error:', err);
    res.status(500).json({ error: 'Failed to fetch employee documents: ' + err.message });
  }
}

export function uploadEmployeeDocument(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const { employee_id, document_type, file_name, file_url, file_size } = req.body;

    if (!employee_id || !document_type || !file_name) {
      return res.status(400).json({ error: 'Employee ID, document type, and file name are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO employee_documents (
        company_id, employee_id, document_type, file_name, file_url, file_size, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `).run(
      companyId,
      employee_id,
      document_type,
      file_name,
      file_url || `/uploads/documents/${file_name}`,
      file_size || '150 KB'
    );

    const doc = db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(insert.lastInsertRowid);

    logAuditEvent({
      companyId,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'DOCUMENT_UPLOADED',
      resource: `Doc #${doc.id}: ${document_type} for Employee #${employee_id}`,
      details: `File: ${file_name} (${file_size || '150 KB'})`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Document uploaded successfully and queued for HR verification.',
      document: doc,
    });
  } catch (err) {
    console.error('uploadEmployeeDocument error:', err);
    res.status(500).json({ error: 'Failed to upload document: ' + err.message });
  }
}

export function verifyEmployeeDocument(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Verified' | 'Rejected'
    const companyId = req.currentUser.company_id || 1;

    if (!['Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Verified or Rejected.' });
    }

    db.prepare(`
      UPDATE employee_documents SET
        verification_status = ?,
        verified_by = ?,
        verified_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).run(status, req.currentUser.id, id, companyId);

    const updated = db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(id);

    logAuditEvent({
      companyId,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'DOCUMENT_VERIFIED',
      resource: `Doc #${id}: ${updated?.document_type}`,
      details: `Status set to ${status} by ${req.currentUser.name}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Document status updated to ${status}.`,
      document: updated,
    });
  } catch (err) {
    console.error('verifyEmployeeDocument error:', err);
    res.status(500).json({ error: 'Failed to verify document: ' + err.message });
  }
}

export function deleteEmployeeDocument(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.currentUser.company_id || 1;

    db.prepare('DELETE FROM employee_documents WHERE id = ? AND company_id = ?').run(id, companyId);
    res.json({ message: 'Document removed successfully.' });
  } catch (err) {
    console.error('deleteEmployeeDocument error:', err);
    res.status(500).json({ error: 'Failed to delete document: ' + err.message });
  }
}

// ==========================================
// 2. Full & Final (FnF) Settlement Controllers
// ==========================================

export function previewFnFSettlement(req, res) {
  try {
    const {
      employee_id,
      resignation_date,
      last_working_day,
      notice_period_days,
      notice_served_days,
      custom_pending_salary,
    } = req.body;

    if (!employee_id || !resignation_date || !last_working_day) {
      return res.status(400).json({ error: 'Employee ID, resignation date, and last working day are required.' });
    }

    const preview = calculateFnFSettlement({
      employeeId: employee_id,
      resignationDate: resignation_date,
      lastWorkingDay: last_working_day,
      noticePeriodDays: Number(notice_period_days) || 30,
      noticeServedDays: Number(notice_served_days) || 30,
      customPendingSalary: custom_pending_salary ? Number(custom_pending_salary) : null,
    });

    res.json({ preview });
  } catch (err) {
    console.error('previewFnFSettlement error:', err);
    res.status(500).json({ error: 'Failed to compute FnF preview: ' + err.message });
  }
}

export function saveFnFSettlement(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const {
      employee_id,
      resignation_date,
      last_working_day,
      reason,
      notice_period_days,
      notice_shortfall_days,
      notice_pay_deduction,
      basic_da_monthly,
      gratuity_years,
      gratuity_amount,
      earned_leaves_days,
      leave_encashment_amount,
      pending_salary,
      reimbursements,
      total_payable,
      notes,
    } = req.body;

    if (!employee_id || !resignation_date || !last_working_day) {
      return res.status(400).json({ error: 'Employee ID, resignation date, and last working day are required.' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      const insert = db.prepare(`
        INSERT INTO fnf_settlements (
          company_id, employee_id, resignation_date, last_working_day, reason,
          basic_da_monthly, gratuity_years, gratuity_amount,
          earned_leaves_days, leave_encashment_amount,
          notice_period_days, notice_shortfall_days, notice_pay_deduction,
          pending_salary, reimbursements, total_payable, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
      `).run(
        companyId,
        employee_id,
        resignation_date,
        last_working_day,
        reason || 'Resignation',
        basic_da_monthly || 0,
        gratuity_years || 0,
        gratuity_amount || 0,
        earned_leaves_days || 0,
        leave_encashment_amount || 0,
        notice_period_days || 30,
        notice_shortfall_days || 0,
        notice_pay_deduction || 0,
        pending_salary || 0,
        reimbursements || 0,
        total_payable || 0,
        notes || 'Payment of Gratuity Act 1972 Section 4(2) Compliant Settlement'
      );

      // Update employee status to 'Relieved'
      db.prepare(`
        UPDATE employees SET
          status = 'Relieved'
        WHERE id = ? AND company_id = ?
      `).run(employee_id, companyId);

      db.exec('COMMIT;');

      const settlement = db.prepare('SELECT * FROM fnf_settlements WHERE id = ?').get(insert.lastInsertRowid);

      logAuditEvent({
        companyId,
        userId: req.currentUser.id,
        userName: req.currentUser.name,
        userRole: req.currentUser.role,
        action: 'FNF_SETTLEMENT_FINALIZED',
        resource: `FnF Settlement #${settlement.id} for Employee #${employee_id}`,
        details: `Total Amount Payable: ₹${total_payable} | Gratuity: ₹${gratuity_amount} (${gratuity_years} yrs)`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Full & Final settlement finalized. Employee marked as Relieved.',
        settlement,
      });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('saveFnFSettlement error:', err);
    res.status(500).json({ error: 'Failed to save FnF settlement: ' + err.message });
  }
}

export function getFnFSettlements(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const settlements = db.prepare(`
      SELECT f.*,
             e.first_name, e.last_name, e.employee_code, e.joining_date,
             d.name as department_name
      FROM fnf_settlements f
      JOIN employees e ON f.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE f.company_id = ?
      ORDER BY f.id DESC
    `).all(companyId);

    res.json({ settlements });
  } catch (err) {
    console.error('getFnFSettlements error:', err);
    res.status(500).json({ error: 'Failed to fetch FnF settlements: ' + err.message });
  }
}

export function getEmployeeFnF(req, res) {
  try {
    const { employeeId } = req.params;
    const companyId = req.currentUser.company_id || 1;

    const settlement = db.prepare(`
      SELECT f.*,
             e.first_name, e.last_name, e.employee_code, e.joining_date,
             d.name as department_name
      FROM fnf_settlements f
      JOIN employees e ON f.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE f.employee_id = ? AND f.company_id = ?
      ORDER BY f.id DESC
      LIMIT 1
    `).get(employeeId, companyId);

    res.json({ settlement: settlement || null });
  } catch (err) {
    console.error('getEmployeeFnF error:', err);
    res.status(500).json({ error: 'Failed to fetch employee FnF record: ' + err.message });
  }
}
