import db from '../config/database.js';
import { calculateEmployeePayroll } from '../services/payrollEngine.js';
import { generatePayslipPDF } from '../services/pdfService.js';
import { sendPayslipEmail } from '../services/emailService.js';
import { generateEpfoEcrText, generateBankBatchCsv } from '../services/complianceEngine.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { dispatchWebhook } from '../services/webhookService.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getPayrollBatches(req, res) {
  try {
    const batches = db.prepare(`
      SELECT pb.*, u.email as processed_by_email,
             COUNT(ps.id) as payslip_count
      FROM payroll_batches pb
      LEFT JOIN users u ON pb.processed_by = u.id
      LEFT JOIN payslips ps ON pb.id = ps.payroll_batch_id
      GROUP BY pb.id
      ORDER BY pb.year DESC, pb.month DESC
    `).all();

    res.json({ batches });
  } catch (err) {
    console.error('getPayrollBatches error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll batches.' });
  }
}

export function previewPayrollBatch(req, res) {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const employees = db.prepare("SELECT id FROM employees WHERE status = 'Active'").all();

    const previews = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const emp of employees) {
      const calc = calculateEmployeePayroll(emp.id, Number(month), Number(year));
      previews.push(calc);
      totalGross += calc.total_earnings;
      totalDeductions += calc.total_deductions;
      totalNet += calc.net_salary;
    }

    res.json({
      month: Number(month),
      year: Number(year),
      month_name: MONTH_NAMES[Number(month) - 1],
      employee_count: employees.length,
      summary: {
        total_gross: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        total_net: Math.round(totalNet * 100) / 100,
      },
      previews,
    });
  } catch (err) {
    console.error('previewPayrollBatch error:', err);
    res.status(500).json({ error: 'Failed to preview payroll: ' + err.message });
  }
}

export function generatePayrollBatch(req, res) {
  try {
    const { month, year, batch_name, notes } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const m = Number(month);
    const y = Number(year);
    const name = batch_name || `${MONTH_NAMES[m - 1]} ${y} Payroll Run`;

    const employees = db.prepare("SELECT id FROM employees WHERE status = 'Active'").all();
    if (employees.length === 0) {
      return res.status(400).json({ error: 'No active employees found to generate payroll for.' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Create or get existing batch
      let batch = db.prepare('SELECT id FROM payroll_batches WHERE month = ? AND year = ?').get(m, y);

      let batchId;
      if (batch) {
        batchId = batch.id;
        db.prepare(`
          UPDATE payroll_batches SET
            batch_name = ?,
            processed_by = ?,
            processed_at = CURRENT_TIMESTAMP,
            notes = ?
          WHERE id = ?
        `).run(name, req.user.id, notes || null, batchId);
      } else {
        const ins = db.prepare(`
          INSERT INTO payroll_batches (month, year, batch_name, processed_by, processed_at, notes, status)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'Draft')
        `).run(m, y, name, req.user.id, notes || null);
        
        const row = db.prepare('SELECT id FROM payroll_batches WHERE month = ? AND year = ?').get(m, y);
        batchId = row.id;
      }

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerPf = 0;
      let totalEmployerEsic = 0;
      let totalPt = 0;
      let totalTds = 0;

      const upsertPayslip = db.prepare(`
        INSERT INTO payslips (
          payroll_batch_id, employee_id, month, year,
          base_salary, da, hra, conveyance, medical, special_allowance,
          bonus, overtime_pay, reimbursements, total_earnings,
          provident_fund, professional_tax, health_insurance, tds_tax,
          lop_deduction, lwf_deduction, other_deductions, total_deductions, net_salary,
          employer_pf, employer_esic, tax_regime, pan_number, uan_number, aadhaar_masked,
          digital_sign_hash, statutory_retention_until,
          total_working_days, present_days, paid_leaves, unpaid_leaves,
          overtime_hours, status
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          ?, 'Generated'
        )
        ON CONFLICT(employee_id, month, year) DO UPDATE SET
          payroll_batch_id = excluded.payroll_batch_id,
          base_salary = excluded.base_salary,
          da = excluded.da,
          hra = excluded.hra,
          conveyance = excluded.conveyance,
          medical = excluded.medical,
          special_allowance = excluded.special_allowance,
          bonus = excluded.bonus,
          overtime_pay = excluded.overtime_pay,
          reimbursements = excluded.reimbursements,
          total_earnings = excluded.total_earnings,
          provident_fund = excluded.provident_fund,
          professional_tax = excluded.professional_tax,
          health_insurance = excluded.health_insurance,
          tds_tax = excluded.tds_tax,
          lop_deduction = excluded.lop_deduction,
          lwf_deduction = excluded.lwf_deduction,
          other_deductions = excluded.other_deductions,
          total_deductions = excluded.total_deductions,
          net_salary = excluded.net_salary,
          employer_pf = excluded.employer_pf,
          employer_esic = excluded.employer_esic,
          tax_regime = excluded.tax_regime,
          pan_number = excluded.pan_number,
          uan_number = excluded.uan_number,
          aadhaar_masked = excluded.aadhaar_masked,
          digital_sign_hash = excluded.digital_sign_hash,
          statutory_retention_until = excluded.statutory_retention_until,
          total_working_days = excluded.total_working_days,
          present_days = excluded.present_days,
          paid_leaves = excluded.paid_leaves,
          unpaid_leaves = excluded.unpaid_leaves,
          overtime_hours = excluded.overtime_hours
      `);

      for (const emp of employees) {
        const p = calculateEmployeePayroll(emp.id, m, y);
        upsertPayslip.run(
          batchId, emp.id, m, y,
          p.base_salary, p.da || 0, p.hra, p.conveyance, p.medical, p.special_allowance,
          p.bonus, p.overtime_pay, p.reimbursements || 0, p.total_earnings,
          p.provident_fund, p.professional_tax, p.health_insurance, p.tds_tax,
          p.lop_deduction, p.lwf_deduction || 0, p.other_deductions, p.total_deductions, p.net_salary,
          p.employer_pf || 0, p.employer_esic || 0, p.tax_regime || 'New',
          p.pan_number || '', p.uan_number || '', p.aadhaar_masked || '',
          p.digital_sign_hash || '', p.statutory_retention_until || '',
          p.total_working_days, p.present_days, p.paid_leaves, p.unpaid_leaves,
          p.overtime_hours
        );

        totalGross += p.total_earnings;
        totalDeductions += p.total_deductions;
        totalNet += p.net_salary;
        totalEmployerPf += (p.employer_pf || 0);
        totalEmployerEsic += (p.employer_esic || 0);
        totalPt += (p.professional_tax || 0);
        totalTds += (p.tds_tax || 0);
      }

      // Update batch totals with statutory breakdowns
      db.prepare(`
        UPDATE payroll_batches SET
          total_gross = ?,
          total_deductions = ?,
          total_net = ?,
          total_employer_pf = ?,
          total_employer_esic = ?,
          total_pt = ?,
          total_tds = ?
        WHERE id = ?
      `).run(
        Math.round(totalGross * 100) / 100,
        Math.round(totalDeductions * 100) / 100,
        Math.round(totalNet * 100) / 100,
        Math.round(totalEmployerPf * 100) / 100,
        Math.round(totalEmployerEsic * 100) / 100,
        Math.round(totalPt * 100) / 100,
        Math.round(totalTds * 100) / 100,
        batchId
      );

      logAuditEvent({
        companyId: req.currentUser.company_id || 1,
        userId: req.currentUser.id,
        userName: req.currentUser.name,
        userRole: req.currentUser.role,
        action: 'PAYROLL_GENERATED',
        resource: `Batch #${batchId}: ${name}`,
        details: `Calculated payroll for ${employees.length} employees. Gross: ₹${totalGross.toFixed(2)}, Net: ₹${totalNet.toFixed(2)}, PF: ₹${totalEmployerPf.toFixed(2)}`,
        ipAddress: req.ip,
      });

      db.exec('COMMIT;');

      res.status(201).json({
        message: `Successfully generated payroll for ${employees.length} employees with Indian statutory & Labour Code calculations.`,
        batch_id: batchId,
        summary: {
          total_gross: Math.round(totalGross * 100) / 100,
          total_deductions: Math.round(totalDeductions * 100) / 100,
          total_net: Math.round(totalNet * 100) / 100,
          total_employer_pf: Math.round(totalEmployerPf * 100) / 100,
          total_employer_esic: Math.round(totalEmployerEsic * 100) / 100,
          total_pt: Math.round(totalPt * 100) / 100,
          total_tds: Math.round(totalTds * 100) / 100,
        },
      });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('generatePayrollBatch error:', err);
    res.status(500).json({ error: 'Failed to generate payroll batch: ' + err.message });
  }
}

export function finalizePayrollBatch(req, res) {
  try {
    const id = req.params.id;
    const { payment_date, notes } = req.body;
    const payDate = payment_date || new Date().toISOString().split('T')[0];

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE payroll_batches SET
          status = 'Paid',
          payment_date = ?,
          notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(payDate, notes || null, id);

      db.prepare(`
        UPDATE payslips SET
          status = 'Paid'
        WHERE payroll_batch_id = ?
      `).run(id);

      // Mark all approved expenses included in this payroll batch as Reimbursed
      db.prepare(`
        UPDATE expenses
        SET status = 'Reimbursed',
            payroll_batch_id = ?,
            reimbursed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'Approved'
          AND employee_id IN (SELECT employee_id FROM payslips WHERE payroll_batch_id = ?)
      `).run(id, id);

      db.exec('COMMIT;');

      try {
        const companyId = req.currentUser.company_id || 1;
        dispatchWebhook(companyId, 'payroll.disbursed', {
          message: `Salary disbursement finalized for Payroll Batch #${id}. Payment date: ${payDate}.`,
        });
      } catch (whErr) {
        // non-blocking
      }

      res.json({ message: 'Payroll batch finalized and marked as Paid!' });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    console.error('finalizePayrollBatch error:', err);
    res.status(500).json({ error: 'Failed to finalize payroll batch.' });
  }
}

export function getPayslips(req, res) {
  try {
    const isHrOrAdmin = ['admin', 'hr'].includes(req.user.role);
    const { batch_id, month, year, employee_id } = req.query;

    let query = `
      SELECT ps.*,
             e.first_name, e.last_name, e.employee_code, e.avatar_url,
             d.name as department_name, pb.batch_name
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
      WHERE 1=1
    `;
    const params = [];

    if (!isHrOrAdmin) {
      query += ' AND ps.employee_id = ?';
      params.push(req.currentUser.employee_id);
    } else {
      if (employee_id) {
        query += ' AND ps.employee_id = ?';
        params.push(employee_id);
      }
    }

    if (batch_id) {
      query += ' AND ps.payroll_batch_id = ?';
      params.push(batch_id);
    }
    if (month) {
      query += ' AND ps.month = ?';
      params.push(month);
    }
    if (year) {
      query += ' AND ps.year = ?';
      params.push(year);
    }

    query += ' ORDER BY ps.year DESC, ps.month DESC, e.first_name ASC';

    const payslips = db.prepare(query).all(...params);
    res.json({ payslips });
  } catch (err) {
    console.error('getPayslips error:', err);
    res.status(500).json({ error: 'Failed to fetch payslips.' });
  }
}

export function getPayslipById(req, res) {
  try {
    const id = req.params.id;
    const isHrOrAdmin = ['admin', 'hr'].includes(req.user.role);

    const payslip = db.prepare(`
      SELECT ps.*,
             e.first_name, e.last_name, e.employee_code, e.avatar_url,
             e.designation, e.bank_name, e.bank_account_no, e.bank_ifsc, e.tax_id,
             d.name as department_name, pb.batch_name, pb.payment_date
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
      WHERE ps.id = ?
    `).get(id);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    if (!isHrOrAdmin && payslip.employee_id !== req.currentUser.employee_id) {
      return res.status(403).json({ error: 'Access denied to this payslip.' });
    }

    const company = db.prepare('SELECT * FROM company_settings LIMIT 1').get() || {};

    res.json({ payslip, company });
  } catch (err) {
    console.error('getPayslipById error:', err);
    res.status(500).json({ error: 'Failed to retrieve payslip.' });
  }
}

export function updatePayslip(req, res) {
  try {
    const id = req.params.id;
    const { bonus, other_deductions, notes } = req.body;

    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(id);
    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    const newBonus = bonus !== undefined ? Number(bonus) : payslip.bonus;
    const newOtherDeductions = other_deductions !== undefined ? Number(other_deductions) : payslip.other_deductions;

    const totalEarnings = Math.round(
      (payslip.base_salary + payslip.hra + payslip.conveyance + payslip.medical +
       payslip.special_allowance + newBonus + payslip.overtime_pay) * 100
    ) / 100;

    const totalDeductions = Math.round(
      (payslip.provident_fund + payslip.professional_tax + payslip.health_insurance +
       payslip.tds_tax + payslip.lop_deduction + newOtherDeductions) * 100
    ) / 100;

    const netSalary = Math.max(0, Math.round((totalEarnings - totalDeductions) * 100) / 100);

    db.prepare(`
      UPDATE payslips SET
        bonus = ?,
        other_deductions = ?,
        total_earnings = ?,
        total_deductions = ?,
        net_salary = ?,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(newBonus, newOtherDeductions, totalEarnings, totalDeductions, netSalary, notes || null, id);

    res.json({ message: 'Payslip updated successfully.' });
  } catch (err) {
    console.error('updatePayslip error:', err);
    res.status(500).json({ error: 'Failed to update payslip.' });
  }
}

export async function downloadPayslipPDF(req, res) {
  try {
    const id = req.params.id;
    const isHrOrAdmin = ['admin', 'hr'].includes(req.user.role);

    const payslip = db.prepare(`
      SELECT ps.*,
             e.first_name, e.last_name, e.employee_code,
             e.designation, e.bank_name, e.bank_account_no, e.tax_id,
             d.name as department_name, pb.batch_name
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
      WHERE ps.id = ?
    `).get(id);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    if (!isHrOrAdmin && payslip.employee_id !== req.currentUser.employee_id) {
      return res.status(403).json({ error: 'Access denied to this payslip.' });
    }

    payslip.employee_name = `${payslip.first_name} ${payslip.last_name}`;

    const companyId = payslip.company_id || req.currentUser.company_id || 1;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};
    const pdfBuffer = await generatePayslipPDF(payslip, company);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payslip-${payslip.employee_code}-${payslip.month}-${payslip.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadPayslipPDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF payslip.' });
  }
}

export async function emailBatchPayslips(req, res) {
  try {
    const batchId = req.params.id;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Payroll batch not found.' });
    }

    const payslips = db.prepare(`
      SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.email, e.designation,
             e.bank_name, e.bank_account_no, e.tax_id, d.name as department_name, pb.batch_name
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
      WHERE ps.payroll_batch_id = ?
    `).all(batchId);

    if (payslips.length === 0) {
      return res.status(400).json({ error: 'No payslips found in this batch.' });
    }

    const companyId = req.currentUser.company_id || 1;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};

    let sentCount = 0;
    const failures = [];

    for (const ps of payslips) {
      try {
        ps.employee_name = `${ps.first_name} ${ps.last_name}`;
        const pdfBuffer = await generatePayslipPDF(ps, company);
        await sendPayslipEmail(ps, company, ps, pdfBuffer);

        db.prepare('UPDATE payslips SET email_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(ps.id);
        sentCount++;
      } catch (sendErr) {
        console.error(`Failed to email payslip for employee ${ps.employee_code}:`, sendErr.message);
        failures.push({ employee: `${ps.first_name} ${ps.last_name}`, error: sendErr.message });
      }
    }

    res.json({
      message: `Successfully emailed ${sentCount} out of ${payslips.length} payslips.`,
      sent_count: sentCount,
      total_count: payslips.length,
      failures,
    });
  } catch (err) {
    console.error('emailBatchPayslips error:', err);
    res.status(500).json({ error: 'Failed to dispatch batch payslip emails: ' + err.message });
  }
}

export async function emailSinglePayslip(req, res) {
  try {
    const id = req.params.id;
    const isHrOrAdmin = ['owner', 'admin', 'hr'].includes(req.currentUser.role);

    const payslip = db.prepare(`
      SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.email, e.designation,
             e.bank_name, e.bank_account_no, e.tax_id, d.name as department_name, pb.batch_name
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
      WHERE ps.id = ?
    `).get(id);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    if (!isHrOrAdmin && payslip.employee_id !== req.currentUser.employee_id) {
      return res.status(403).json({ error: 'Access denied to this payslip.' });
    }

    payslip.employee_name = `${payslip.first_name} ${payslip.last_name}`;
    const companyId = payslip.company_id || req.currentUser.company_id || 1;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};

    const pdfBuffer = await generatePayslipPDF(payslip, company);
    await sendPayslipEmail(payslip, company, payslip, pdfBuffer);

    db.prepare('UPDATE payslips SET email_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(payslip.id);

    res.json({ message: `Payslip email sent to ${payslip.email} successfully!` });
  } catch (err) {
    console.error('emailSinglePayslip error:', err);
    res.status(500).json({ error: 'Failed to email payslip: ' + err.message });
  }
}

// 🛡️ Maker-Checker: Maker Submits Batch for Review
export function submitBatchForReview(req, res) {
  try {
    const id = req.params.id;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    db.prepare(`
      UPDATE payroll_batches
      SET checker_status = 'Under Review',
          submitted_by = ?,
          submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.currentUser.id, id);

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'PAYROLL_MAKER_SUBMITTED',
      resource: `Batch #${id}: ${batch.batch_name}`,
      details: 'Maker submitted payroll batch for Checker/Admin compliance review.',
      ipAddress: req.ip,
    });

    res.json({ message: 'Payroll batch submitted for Checker / Compliance Review successfully!' });
  } catch (err) {
    console.error('submitBatchForReview error:', err);
    res.status(500).json({ error: 'Failed to submit batch: ' + err.message });
  }
}

// 🛡️ Maker-Checker: Checker Approves Batch
export function approveBatch(req, res) {
  try {
    const id = req.params.id;
    const { checker_notes } = req.body;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    db.prepare(`
      UPDATE payroll_batches
      SET checker_status = 'Approved',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          checker_notes = ?
      WHERE id = ?
    `).run(req.currentUser.id, checker_notes || 'Approved after statutory & Labour Code verification.', id);

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'PAYROLL_CHECKER_APPROVED',
      resource: `Batch #${id}: ${batch.batch_name}`,
      details: `Checker approved payroll batch. Notes: ${checker_notes || 'All statutory rules verified'}`,
      ipAddress: req.ip,
    });

    try {
      const companyId = req.currentUser.company_id || 1;
      dispatchWebhook(companyId, 'payroll.checker_approved', {
        message: `Payroll Batch #${id} (${batch.batch_name}) approved by Checker ${req.currentUser.name}. Ready for disbursement.`,
      });
    } catch (whErr) {
      // non-blocking
    }

    res.json({ message: 'Payroll batch approved by Checker and ready for disbursement!' });
  } catch (err) {
    console.error('approveBatch error:', err);
    res.status(500).json({ error: 'Failed to approve batch: ' + err.message });
  }
}

// 🛡️ Maker-Checker: Checker Rejects Batch with Feedback
export function rejectBatch(req, res) {
  try {
    const id = req.params.id;
    const { checker_notes } = req.body;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    db.prepare(`
      UPDATE payroll_batches
      SET checker_status = 'Draft',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          checker_notes = ?
      WHERE id = ?
    `).run(req.currentUser.id, checker_notes || 'Returned for recalculation.', id);

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'PAYROLL_CHECKER_REJECTED',
      resource: `Batch #${id}: ${batch.batch_name}`,
      details: `Checker returned batch for adjustments. Notes: ${checker_notes || 'Needs adjustment'}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Payroll batch returned to Maker with review remarks.' });
  } catch (err) {
    console.error('rejectBatch error:', err);
    res.status(500).json({ error: 'Failed to reject batch: ' + err.message });
  }
}

// 🏛️ EPFO ECR File Export (.txt format for official Unified Portal filing)
export function exportEcrFile(req, res) {
  try {
    const id = req.params.id;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    const payslips = db.prepare(`
      SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.uan_number
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      WHERE ps.payroll_batch_id = ?
    `).all(id);

    payslips.forEach(p => {
      p.employee_name = `${p.first_name} ${p.last_name}`;
    });

    const ecrText = generateEpfoEcrText(payslips);

    db.prepare('UPDATE payroll_batches SET ecr_export_generated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'EPFO_ECR_EXPORTED',
      resource: `Batch #${id}`,
      details: `Generated EPFO electronic challan cum return file for ${payslips.length} members.`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="ECR_EPFO_${batch.month}_${batch.year}.txt"`);
    res.send(ecrText);
  } catch (err) {
    console.error('exportEcrFile error:', err);
    res.status(500).json({ error: 'Failed to generate ECR file: ' + err.message });
  }
}

// 🏛️ Corporate Bank Salary Batch File Export (NACH / NEFT format)
export function exportBankBatchFile(req, res) {
  try {
    const id = req.params.id;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    const payslips = db.prepare(`
      SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.bank_name, e.bank_account_no, e.bank_ifsc
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      WHERE ps.payroll_batch_id = ?
    `).all(id);

    payslips.forEach(p => {
      p.employee_name = `${p.first_name} ${p.last_name}`;
    });

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(batch.company_id || 1) || {};
    const csvContent = generateBankBatchCsv(payslips, company);

    db.prepare('UPDATE payroll_batches SET bank_export_generated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'BANK_BATCH_EXPORTED',
      resource: `Batch #${id}`,
      details: `Generated corporate bank NACH/NEFT disbursement file for ${payslips.length} employees.`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Bank_Salary_Batch_${batch.month}_${batch.year}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('exportBankBatchFile error:', err);
    res.status(500).json({ error: 'Failed to generate bank batch file: ' + err.message });
  }
}

// 🏛️ Form T Register of Wages under Code on Wages & State Rules
export function exportFormTWageRegister(req, res) {
  try {
    const id = req.params.id;
    const batch = db.prepare('SELECT * FROM payroll_batches WHERE id = ?').get(id);
    if (!batch) return res.status(404).json({ error: 'Payroll batch not found.' });

    const payslips = db.prepare(`
      SELECT ps.*, e.first_name, e.last_name, e.employee_code, e.designation, e.pan_number, e.uan_number
      FROM payslips ps
      JOIN employees e ON ps.employee_id = e.id
      WHERE ps.payroll_batch_id = ?
    `).all(id);

    const headers = [
      'Sl No', 'Employee Code', 'Employee Name', 'Designation', 'PAN', 'UAN',
      'Working Days', 'Present Days', 'Basic', 'DA', 'HRA', 'Conveyance', 'Special Allowance',
      'Overtime Pay', 'Total Gross (A)', 'EPF (EE)', 'ESIC (EE)', 'PT', 'TDS', 'LOP', 'Total Deductions (B)', 'Net Wages (A-B)', 'Digital Seal'
    ];

    const rows = [headers.join(',')];
    payslips.forEach((p, idx) => {
      rows.push([
        idx + 1,
        `"${p.employee_code}"`,
        `"${p.first_name} ${p.last_name}"`,
        `"${p.designation || 'Staff'}"`,
        `"${p.pan_number || ''}"`,
        `"${p.uan_number || ''}"`,
        p.total_working_days,
        p.present_days,
        p.base_salary,
        p.da || 0,
        p.hra || 0,
        p.conveyance || 0,
        p.special_allowance || 0,
        p.overtime_pay || 0,
        p.total_earnings,
        p.provident_fund || 0,
        p.health_insurance || 0,
        p.professional_tax || 0,
        p.tds_tax || 0,
        p.lop_deduction || 0,
        p.total_deductions,
        p.net_salary,
        `"${p.digital_sign_hash || 'VERIFIED'}"`
      ].join(','));
    });

    logAuditEvent({
      companyId: req.currentUser.company_id || 1,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      userRole: req.currentUser.role,
      action: 'FORM_T_REGISTER_EXPORTED',
      resource: `Batch #${id}`,
      details: `Generated statutory Form T Wage Register for ${payslips.length} employees.`,
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Form_T_Wage_Register_${batch.month}_${batch.year}.csv"`);
    res.send(rows.join('\n'));
  } catch (err) {
    console.error('exportFormTWageRegister error:', err);
    res.status(500).json({ error: 'Failed to export Form T register: ' + err.message });
  }
}
