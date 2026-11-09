import db from '../config/database.js';

/**
 * Egotech AI - Enterprise HR & Statutory Tax Assistant Engine
 * Performs contextual knowledge lookup across Indian Labour Codes, Section 192 TDS,
 * Gratuity Act 1972, DPDP Act 2023, and real-time employee data.
 */

export function askAiAssistant(req, res) {
  try {
    const { prompt } = req.body;
    const user = req.currentUser;
    const companyId = user.company_id || 1;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A question or prompt is required.' });
    }

    const query = prompt.toLowerCase().trim();

    // Fetch contextual data for current employee (if employee role) or general company context
    let emp = null;
    let leaveBalances = [];
    let latestPayslip = null;

    if (user.employee_id) {
      emp = db.prepare(`
        SELECT e.*, d.name as department_name, s.base_salary, s.da, s.hra, s.special_allowance
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN salary_structures s ON e.id = s.employee_id
        WHERE e.id = ?
      `).get(user.employee_id);

      const year = new Date().getFullYear();
      leaveBalances = db.prepare(`
        SELECT lb.*, lt.name as leave_name, lt.code as leave_code
        FROM leave_balances lb
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id = ? AND lb.year = ?
      `).all(user.employee_id, year);

      latestPayslip = db.prepare(`
        SELECT ps.*, pb.month, pb.year, pb.batch_name
        FROM payslips ps
        JOIN payroll_batches pb ON ps.payroll_batch_id = pb.id
        WHERE ps.employee_id = ?
        ORDER BY pb.year DESC, pb.month DESC
        LIMIT 1
      `).get(user.employee_id);
    }

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};

    let answer = '';
    let category = 'General';
    let suggestedActions = [];

    // 1. Questions about TDS / Income Tax / Old vs New Regime
    if (query.includes('tds') || query.includes('tax') || query.includes('regime') || query.includes('192') || query.includes('12bb') || query.includes('deduction')) {
      category = 'Income Tax & Section 192';
      const regime = emp?.tax_regime || 'New';
      const tdsAmount = latestPayslip?.income_tax || latestPayslip?.tds || 0;
      const currency = company.currency_symbol || '₹';

      answer = `Under Section 192 of the Income Tax Act, employers are mandated to deduct Tax Deducted at Source (TDS) based on your estimated annual taxable earnings and declared tax regime.\n\n` +
        `• **Your Current Tax Regime:** **${regime} Tax Regime**.\n` +
        `• **Last Month's TDS Deduction:** **${currency}${tdsAmount.toLocaleString()}**.\n\n` +
        `💡 **Key Differences to Consider:**\n` +
        `1. **New Tax Regime (Default):** Offers lower slab rates with a standard deduction of ₹75,000 and Section 87A rebate for taxable income up to ₹7,00,000 (effectively zero tax up to ₹7.75L). However, exemptions like HRA (Section 10(13A)), LTA, and Section 80C deductions are not permitted.\n` +
        `2. **Old Tax Regime:** Higher tax slab rates, but permits significant deductions including Section 80C (up to ₹1.5L for PF/ELSS/PPF), Section 80D (Health Insurance up to ₹50,000), Section 24(b) Home Loan Interest (up to ₹2L), and actual HRA exemptions.\n\n` +
        `You can review and modify your tax regime choice or submit investment proofs under the **Compliance** tab.`;

      suggestedActions = [
        'How is my annual TDS calculated?',
        'Can I switch between New and Old Tax Regimes?',
        'What documents are needed for Form 12BB?',
      ];
    }
    // 2. Questions about Leaves / Time-Off Balances
    else if (query.includes('leave') || query.includes('vacation') || query.includes('holiday') || query.includes('balance') || query.includes('time off')) {
      category = 'Leave & Attendance';
      if (leaveBalances.length > 0) {
        const balanceList = leaveBalances
          .map((lb) => `• **${lb.leave_name} (${lb.leave_code}):** ${lb.total_days - lb.used_days} remaining out of ${lb.total_days} days (Used: ${lb.used_days} days)`)
          .join('\n');

        answer = `Here is your current live leave balance for ${new Date().getFullYear()}:\n\n${balanceList}\n\n` +
          `📌 *Tip:* Casual leaves expire at the end of the calendar year, while Earned/Privilege Leaves (PL) can be carried forward or encashed upon separation under statutory rules.`;
      } else {
        answer = `Your company provides Paid Privilege Leaves (15 days), Casual Leaves (12 days), and Sick Leaves (10 days). You can submit a leave request directly in the **Leaves** module for manager approval.`;
      }

      suggestedActions = [
        'How do I apply for leave?',
        'What is the policy for leave encashment?',
        'Check my attendance record this month',
      ];
    }
    // 3. Questions about Labour Codes 2025/2026 50% Rule
    else if (query.includes('50%') || query.includes('labour code') || query.includes('labor code') || query.includes('wage') || query.includes('basic salary')) {
      category = 'Labour Codes 2025/2026';
      answer = `Under the four new **Indian Labour Codes** (Code on Wages 2019, Code on Social Security 2020, OSH Code, and Industrial Relations Code):\n\n` +
        `1. **The 50% Wage Uniformity Rule:** The total of Basic Pay + Dearness Allowance (DA) + Retaining Allowance must constitute at least **50% of the employee's total gross remuneration**.\n` +
        `2. **Consequence of Excessive Allowances:** If special allowances, HRA, and perks exceed 50% of gross pay, the surplus is deemed as wages and added to the calculation base for Employee Provident Fund (EPF), Gratuity, and ESI.\n` +
        `3. **Employee Benefit:** While take-home salary may slightly adjust due to increased statutory PF contributions, your long-term retirement savings and Gratuity accumulation increase significantly.`;

      suggestedActions = [
        'Calculate my gratuity eligibility',
        'How does the 50% rule impact my take-home pay?',
        'Is my current salary structure Labour Code compliant?',
      ];
    }
    // 4. Questions about Gratuity / FnF
    else if (query.includes('gratuity') || query.includes('fnf') || query.includes('settlement') || query.includes('resignation') || query.includes('exit')) {
      category = 'Statutory Gratuity & Full & Final';
      answer = `Under **Section 4(2) of the Payment of Gratuity Act, 1972**:\n\n` +
        `• **Eligibility:** Continuous service of 5 or more years with the establishment (waived in case of death or disablement).\n` +
        `• **Statutory Formula:**\n` +
        `$$\\text{Gratuity} = \\frac{15 \\times (\\text{Basic} + \\text{DA}) \\times \\text{Completed Years of Service}}{26}$$\n\n` +
        `• **6-Month Rounding Rule:** If service tenure exceeds 6 months in the final year of employment, it is rounded up to the next full year (e.g. 5 yrs 7 mos = 6 qualifying years).\n` +
        `• **Ceiling:** Statutory tax-exempt ceiling is ₹20,00,000 (Twenty Lakh Rupees).\n\n` +
        `Our Full & Final (FnF) Settlement module automatically applies this exact formula along with leave encashment and notice period adjustments.`;

      suggestedActions = [
        'How is leave encashment calculated on exit?',
        'What is notice period shortfall deduction?',
        'View the FnF calculator in Employee Details',
      ];
    }
    // 5. Questions about POSH Act / Harassment / Grievance
    else if (query.includes('posh') || query.includes('harassment') || query.includes('complaint') || query.includes('icc') || query.includes('grievance')) {
      category = 'POSH Act & Workplace Safety';
      const officer = company.icc_presiding_officer || 'Adv. Meera Sen (Presiding Officer)';
      answer = `Under the **Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act)**:\n\n` +
        `• **Zero Tolerance:** Egotech and ${company.name || 'your organization'} maintain a strict zero-tolerance policy against sexual harassment and discrimination.\n` +
        `• **Internal Complaints Committee (ICC):** An independent committee is formally constituted to investigate complaints within a 90-day statutory timeline.\n` +
        `• **ICC Presiding Officer:** **${officer}**.\n` +
        `• **Confidentiality:** Complainant identity is protected by law under Section 16 of the POSH Act.\n\n` +
        `You can file a formal confidential inquiry under the **Compliance → POSH Act** module.`;

      suggestedActions = [
        'How to file a confidential complaint?',
        'What is the ICC investigation timeline?',
        'Who are the members of the Internal Complaints Committee?',
      ];
    }
    // 6. Questions about DPDP Act 2023 or CERT-In 6-Hour Clock
    else if (query.includes('dpdp') || query.includes('cert') || query.includes('cert-in') || query.includes('data privacy') || query.includes('cyber') || query.includes('breach')) {
      category = 'Cybersecurity & Data Protection';
      answer = `Egotech is architected for strict adherence to Indian cybersecurity and privacy mandates:\n\n` +
        `• **CERT-In Directions (April 2022):** Reportable cybersecurity incidents must be formally disclosed to CERT-In within **6 hours** of detection. All ICT system logs must be retained for **180 days within India** with NTP clock synchronization.\n` +
        `• **DPDP Act 2023 & Rules 2025:** Mandates clear notice and explicit consent before processing employee personal data (Aadhaar, PAN, bank details). Employees possess the Right to Access, Right to Correction/Erasure, and Right to Grievance Redressal.\n` +
        `• **Aadhaar Masking:** Only the last 4 digits are visible to general operators; the first 8 digits are securely masked in accordance with UIDAI regulations.`;

      suggestedActions = [
        'View CERT-In 6-Hour Incident Response Clock',
        'Check DPDP Consent Status',
        'Review 180-Day ICT Audit Log Trail',
      ];
    }
    // 7. General fallback / Smart assistant response
    else {
      category = 'Egotech AI Advisor';
      answer = `Hello ${emp ? emp.first_name : user.name || 'there'}! I am **Egotech AI**, your enterprise assistant for Indian statutory compliance, payroll calculations, and HR policies.\n\n` +
        `I can help you with:\n` +
        `• **Section 192 TDS & Tax Regimes:** Explaining your monthly tax deduction and comparing New vs. Old Tax Regimes.\n` +
        `• **Labour Codes 2025/2026:** Understanding the 50% Basic+DA wage uniformity requirement.\n` +
        `• **Leave Quotas & Attendance:** Checking remaining privilege, casual, and sick leave balances.\n` +
        `• **Payment of Gratuity Act 1972:** Instant eligibility and payout estimation.\n` +
        `• **POSH Act & Workplace Safety:** Guidance on submitting confidential grievances.\n` +
        `• **CERT-In & DPDP Protocols:** Incident response timelines and data privacy consent.\n\n` +
        `Feel free to ask any specific question below!`;

      suggestedActions = [
        'Why is TDS deducted from my payslip?',
        'What is the Labour Code 50% wage rule?',
        'Check my leave balance',
        'Calculate my gratuity eligibility',
      ];
    }

    res.json({
      answer,
      category,
      suggestedActions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('askAiAssistant error:', err);
    res.status(500).json({ error: 'Failed to process AI assistant inquiry: ' + err.message });
  }
}
