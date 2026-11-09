import nodemailer from 'nodemailer';
import db from '../config/database.js';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Elegant simulated transporter for local demo & zero-config testing
    // Records all emails into SQLite email_logs and outputs to console
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`📧 [Simulated Email] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
        return {
          messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          response: '250 Message accepted and queued for delivery (Local Simulated SMTP)',
        };
      },
    };
  }
  return transporter;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Send an itemized vector PDF payslip email to an employee
 */
export async function sendPayslipEmail(payslip, company = {}, employee = {}, pdfBuffer = null) {
  try {
    const t = await getTransporter();
    const currency = company.currency_symbol || '$';
    const companyName = company.name || company.company_name || 'Egotech Technologies';
    const poweredBy = company.powered_by_text || 'Powered by Egotech';
    const monthName = MONTH_NAMES[(payslip.month - 1)] || `Month ${payslip.month}`;
    const toEmail = employee.email || payslip.email;
    const recipientName = employee.first_name ? `${employee.first_name} ${employee.last_name}` : payslip.employee_name || 'Team Member';

    if (!toEmail) {
      throw new Error('Recipient employee email address is required.');
    }

    const subject = `Your Payslip for ${monthName} ${payslip.year} - ${companyName}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; padding: 24px; color: #ffffff; border-bottom: 4px solid ${company.primary_color || '#4f46e5'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">${companyName}</h1>
            <span style="background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">${poweredBy}</span>
          </div>
          <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Official Electronic Salary Disbursement Slip</p>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Dear <strong>${recipientName}</strong>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.5;">
            Your salary for <strong>${monthName} ${payslip.year}</strong> has been calculated and processed by ${companyName} Payroll.
            An official printable PDF copy of your payslip is attached to this email.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Disbursement Summary</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Employee Code:</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${payslip.employee_code || employee.employee_code || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Gross Earnings:</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${currency} ${Number(payslip.total_earnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Total Deductions:</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #ef4444;">-${currency} ${Number(payslip.total_deductions).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              ${Number(payslip.reimbursements) > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Reimbursements Included:</td>
                <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #059669;">+${currency} ${Number(payslip.reimbursements).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>` : ''}
              <tr style="border-top: 2px dashed #cbd5e1;">
                <td style="padding: 10px 0 0; font-weight: 700; font-size: 15px; color: #0f172a;">Net Salary Disbursed:</td>
                <td style="padding: 10px 0 0; font-weight: 700; font-size: 17px; text-align: right; color: #059669;">${currency} ${Number(payslip.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            You can also view your live payslip history, attendance logs, and tax statements online by logging into your employee portal at:
            <br /><a href="http://localhost:3000/payslips" style="color: #4f46e5; text-decoration: underline; font-weight: 600;">http://localhost:3000/payslips</a>
          </p>
        </div>

        <div style="background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
          CONFIDENTIAL: This electronic notification is intended solely for ${toEmail}.
          <br />${companyName} • ${poweredBy}
        </div>
      </div>
    `;

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `Payslip-${payslip.employee_code || 'EMP'}-${payslip.month}-${payslip.year}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions = {
      from: `"${companyName} Payroll" <no-reply@egotech.com>`,
      to: toEmail,
      subject,
      html,
      attachments,
    };

    const result = await t.sendMail(mailOptions);

    // Record in SQLite email_logs
    db.prepare(`
      INSERT INTO email_logs (company_id, recipient_email, recipient_name, subject, type, status, metadata)
      VALUES (?, ?, ?, ?, 'payslip', 'Sent', ?)
    `).run(
      company.id || 1,
      toEmail,
      recipientName,
      subject,
      JSON.stringify({ payslip_id: payslip.id, month: payslip.month, year: payslip.year, net: payslip.net_salary, messageId: result.messageId })
    );

    // Update payslip timestamp
    db.prepare("UPDATE payslips SET email_sent_at = CURRENT_TIMESTAMP WHERE id = ?").run(payslip.id);

    return { success: true, messageId: result.messageId, recipient: toEmail };
  } catch (err) {
    console.error('sendPayslipEmail error:', err);
    throw err;
  }
}

/**
 * Send Leave Application / Review notification
 */
export async function sendLeaveNotificationEmail({ leaveRequest, company = {}, employee = {}, action = 'SUBMITTED', reviewerName = '' }) {
  try {
    const t = await getTransporter();
    const companyName = company.name || 'Egotech Technologies';
    const recipientEmail = action === 'SUBMITTED' ? (company.email || 'hr@company.com') : employee.email;
    const recipientName = action === 'SUBMITTED' ? 'HR / Manager' : `${employee.first_name} ${employee.last_name}`;

    if (!recipientEmail) return null;

    let subject = '';
    let statusBadgeColor = '#3b82f6';
    let statusText = 'Pending Approval';

    if (action === 'SUBMITTED') {
      subject = `New Leave Request: ${employee.first_name} ${employee.last_name} (${leaveRequest.days_count} Days)`;
    } else if (action === 'APPROVED') {
      subject = `Leave Request APPROVED: ${leaveRequest.start_date} to ${leaveRequest.end_date}`;
      statusBadgeColor = '#059669';
      statusText = 'Approved';
    } else if (action === 'REJECTED') {
      subject = `Leave Request UPDATE: Rejected`;
      statusBadgeColor = '#dc2626';
      statusText = 'Rejected';
    }

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1e293b; padding: 18px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 16px;">${companyName} - Leave Management</h2>
        </div>
        <div style="padding: 20px;">
          <p style="margin-top: 0; font-size: 14px;">Hello <strong>${recipientName}</strong>,</p>
          <p style="font-size: 13px; color: #475569;">
            ${action === 'SUBMITTED'
              ? `A new leave request was submitted by <strong>${employee.first_name} ${employee.last_name}</strong>.`
              : `Your leave request has been reviewed by <strong>${reviewerName || 'Management'}</strong>.`}
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 12px;">
            <p style="margin: 3px 0;"><strong>Period:</strong> ${leaveRequest.start_date} to ${leaveRequest.end_date} (${leaveRequest.days_count} Working Days)</p>
            <p style="margin: 3px 0;"><strong>Reason:</strong> ${leaveRequest.reason || 'Not specified'}</p>
            <p style="margin: 3px 0;"><strong>Status:</strong> <span style="background: ${statusBadgeColor}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${statusText}</span></p>
            ${leaveRequest.review_notes ? `<p style="margin: 3px 0; color: #64748b;"><strong>Notes:</strong> ${leaveRequest.review_notes}</p>` : ''}
          </div>

          <a href="http://localhost:3000/leaves" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;">
            Open Leave Portal
          </a>
        </div>
      </div>
    `;

    const result = await t.sendMail({
      from: `"${companyName} HR" <leaves@egotech.com>`,
      to: recipientEmail,
      subject,
      html,
    });

    db.prepare(`
      INSERT INTO email_logs (company_id, recipient_email, recipient_name, subject, type, status, metadata)
      VALUES (?, ?, ?, ?, 'leave', 'Sent', ?)
    `).run(
      company.id || 1,
      recipientEmail,
      recipientName,
      subject,
      JSON.stringify({ leave_id: leaveRequest.id, action, status: statusText })
    );

    return result;
  } catch (err) {
    console.error('sendLeaveNotificationEmail error:', err);
  }
}

/**
 * Send Expense Claim status email notification
 */
export async function sendExpenseNotificationEmail({ expense, company = {}, employee = {}, action = 'SUBMITTED', reviewerName = '' }) {
  try {
    const t = await getTransporter();
    const companyName = company.name || 'Egotech Technologies';
    const currency = company.currency_symbol || '$';
    const recipientEmail = action === 'SUBMITTED' ? (company.email || 'finance@company.com') : employee.email;
    const recipientName = action === 'SUBMITTED' ? 'Finance / Admin' : `${employee.first_name} ${employee.last_name}`;

    if (!recipientEmail) return null;

    let subject = '';
    let statusText = 'Pending Approval';
    let statusBadgeColor = '#3b82f6';

    if (action === 'SUBMITTED') {
      subject = `New Expense Claim: ${currency}${expense.amount} (${expense.category})`;
    } else if (action === 'APPROVED') {
      subject = `Expense Claim APPROVED: ${currency}${expense.amount} (${expense.category})`;
      statusText = 'Approved for Payroll Reimbursement';
      statusBadgeColor = '#059669';
    } else if (action === 'REJECTED') {
      subject = `Expense Claim REJECTED: ${currency}${expense.amount}`;
      statusText = 'Rejected';
      statusBadgeColor = '#dc2626';
    } else if (action === 'REIMBURSED') {
      subject = `Expense Reimbursed: ${currency}${expense.amount} Disbursed in Payroll`;
      statusText = 'Reimbursed in Payslip';
      statusBadgeColor = '#059669';
    }

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1e293b; padding: 18px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 16px;">${companyName} - Expense & Reimbursements</h2>
        </div>
        <div style="padding: 20px;">
          <p style="margin-top: 0; font-size: 14px;">Hello <strong>${recipientName}</strong>,</p>
          <p style="font-size: 13px; color: #475569;">
            ${action === 'SUBMITTED'
              ? `A new expense claim was submitted by <strong>${employee.first_name} ${employee.last_name}</strong> for review.`
              : `Your expense claim for <strong>${currency}${expense.amount}</strong> has been updated.`}
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 12px;">
            <p style="margin: 3px 0;"><strong>Category:</strong> ${expense.category}</p>
            <p style="margin: 3px 0;"><strong>Claim Amount:</strong> ${currency} ${Number(expense.amount).toFixed(2)}</p>
            <p style="margin: 3px 0;"><strong>Date Incurred:</strong> ${expense.expense_date}</p>
            <p style="margin: 3px 0;"><strong>Description:</strong> ${expense.description || 'N/A'}</p>
            <p style="margin: 3px 0;"><strong>Status:</strong> <span style="background: ${statusBadgeColor}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${statusText}</span></p>
            ${expense.review_notes ? `<p style="margin: 3px 0; color: #64748b;"><strong>Review Notes:</strong> ${expense.review_notes}</p>` : ''}
          </div>

          <a href="http://localhost:3000/expenses" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;">
            View Expenses Hub
          </a>
        </div>
      </div>
    `;

    const result = await t.sendMail({
      from: `"${companyName} Finance" <finance@egotech.com>`,
      to: recipientEmail,
      subject,
      html,
    });

    db.prepare(`
      INSERT INTO email_logs (company_id, recipient_email, recipient_name, subject, type, status, metadata)
      VALUES (?, ?, ?, ?, 'expense', 'Sent', ?)
    `).run(
      company.id || 1,
      recipientEmail,
      recipientName,
      subject,
      JSON.stringify({ expense_id: expense.id, action, amount: expense.amount })
    );

    return result;
  } catch (err) {
    console.error('sendExpenseNotificationEmail error:', err);
  }
}

/**
 * Get email audit logs for a company
 */
export function getEmailLogs(companyId) {
  try {
    return db.prepare(`
      SELECT * FROM email_logs
      WHERE company_id = ?
      ORDER BY id DESC
      LIMIT 100
    `).all(companyId);
  } catch (err) {
    console.error('getEmailLogs error:', err);
    return [];
  }
}
