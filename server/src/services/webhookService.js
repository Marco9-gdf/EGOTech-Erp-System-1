import db from '../config/database.js';

/**
 * Enterprise Webhook & Multi-Channel Notification Engine for Egotech
 * Supports Slack, Microsoft Teams, WhatsApp & SMS alerts.
 */

export async function dispatchWebhook(companyId, eventType, payload) {
  try {
    const company = db.prepare('SELECT id, name, slack_webhook_url, whatsapp_notifications_enabled FROM companies WHERE id = ?').get(companyId || 1);
    if (!company) return;

    const timestamp = new Date().toISOString();
    const eventTitle = getEventTitle(eventType);

    // 1. Dispatch to Slack / Teams Incoming Webhook if configured
    if (company.slack_webhook_url && company.slack_webhook_url.startsWith('http')) {
      const slackBody = {
        text: `*[Egotech Alert]* ${eventTitle}: ${payload.message || 'Automated system event'}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🔔 ${eventTitle}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Company:*\n${company.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*Timestamp (IST):*\n${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: payload.message || 'Notification triggered via Egotech webhook engine.',
            },
          },
        ],
      };

      try {
        const response = await fetch(company.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackBody),
        });

        const status = response.status;
        const resText = await response.text();

        db.prepare(`
          INSERT INTO webhook_logs (company_id, channel, event_type, payload, status_code, response_body)
          VALUES (?, 'slack', ?, ?, ?, ?)
        `).run(companyId, eventType, JSON.stringify(slackBody), status, resText.slice(0, 500));
      } catch (err) {
        db.prepare(`
          INSERT INTO webhook_logs (company_id, channel, event_type, payload, status_code, response_body)
          VALUES (?, 'slack', ?, ?, 500, ?)
        `).run(companyId, eventType, JSON.stringify(slackBody), err.message);
      }
    }

    // 2. Dispatch simulated WhatsApp / SMS Notification if enabled
    if (company.whatsapp_notifications_enabled) {
      const waPayload = {
        recipient: payload.phone || '+91 98765 43210 (HR Office)',
        template: 'egotech_statutory_alert_v1',
        event: eventType,
        summary: payload.message || eventTitle,
        dispatched_at: timestamp,
      };

      db.prepare(`
        INSERT INTO webhook_logs (company_id, channel, event_type, payload, status_code, response_body)
        VALUES (?, 'whatsapp', ?, ?, 200, 'Delivered via Egotech WhatsApp Gateway Simulator')
      `).run(companyId, eventType, JSON.stringify(waPayload));
    }
  } catch (globalErr) {
    console.error('Webhook dispatch error:', globalErr.message);
  }
}

function getEventTitle(eventType) {
  switch (eventType) {
    case 'leave.applied':
      return 'New Leave Application Submitted';
    case 'leave.approved':
      return 'Leave Request Approved';
    case 'leave.rejected':
      return 'Leave Request Rejected';
    case 'expense.approved':
      return 'Expense Reimbursement Approved';
    case 'expense.reimbursed':
      return 'Expense Payment Processed';
    case 'payroll.checker_approved':
      return 'Payroll Batch Approved by Checker';
    case 'payroll.disbursed':
      return 'Salary Batch Disbursed';
    case 'compliance.incident_reported':
      return '⚠️ CERT-In Cybersecurity Incident Logged (6-Hr SLA)';
    case 'biometric.sync_complete':
      return 'Biometric Hardware Attendance Synced';
    case 'test.ping':
      return 'Egotech Test Notification Dispatch';
    default:
      return 'System Notification';
  }
}

export function getWebhookLogs(companyId) {
  return db.prepare(`
    SELECT * FROM webhook_logs
    WHERE company_id = ?
    ORDER BY id DESC
    LIMIT 50
  `).all(companyId || 1);
}
