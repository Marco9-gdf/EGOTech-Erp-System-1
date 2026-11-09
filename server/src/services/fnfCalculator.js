import db from '../config/database.js';

/**
 * Indian Full & Final (FnF) Settlement Calculator
 * Implements Payment of Gratuity Act 1972 Section 4(2), Leave Encashment, and Notice Recovery.
 */

export function calculateFnFSettlement({
  employeeId,
  resignationDate,
  lastWorkingDay,
  noticePeriodDays = 30,
  noticeServedDays = 30,
  customPendingSalary = null,
}) {
  const employee = db.prepare(`
    SELECT e.*, d.name as department_name, s.base_salary, s.da, s.hra, s.special_allowance
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN salary_structures s ON e.id = s.employee_id
    WHERE e.id = ?
  `).get(employeeId);

  if (!employee) {
    throw new Error('Employee record not found.');
  }

  const joinDate = new Date(employee.joining_date);
  const lwd = new Date(lastWorkingDay);
  const resDate = new Date(resignationDate);

  // 1. Calculate Tenured Service Duration
  const diffTime = Math.max(0, lwd.getTime() - joinDate.getTime());
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const rawYears = totalDays / 365.25;
  const fullYears = Math.floor(rawYears);
  const remainderMonths = Math.floor((rawYears - fullYears) * 12);

  // Section 4(2) rounding: > 6 months rounds up to next full year
  let gratuityYears = fullYears;
  if (remainderMonths >= 6) {
    gratuityYears += 1;
  }

  // 2. Gratuity Calculation (Basic + DA)
  const baseSalary = employee.base_salary || 30000;
  const da = employee.da || 0;
  const basicPlusDa = baseSalary + da;
  const isGratuityEligible = fullYears >= 5 || (fullYears === 4 && remainderMonths >= 6);

  let gratuityAmount = 0;
  if (isGratuityEligible) {
    // Formula: (15 * (Basic + DA) * Years) / 26
    gratuityAmount = Math.round((15 * basicPlusDa * gratuityYears) / 26);
    // Statutory ceiling: 20 Lakhs (INR 2,000,000)
    gratuityAmount = Math.min(gratuityAmount, 2000000);
  }

  // 3. Leave Encashment Calculation
  // Fetch earned/privilege leave balance
  const currentYear = lwd.getFullYear();
  const leaveBalance = db.prepare(`
    SELECT (total_days - used_days) as balance
    FROM leave_balances lb
    JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.employee_id = ? AND lb.year = ? AND (lt.code = 'PL' OR lt.code = 'EL' OR lt.name LIKE '%Earned%' OR lt.name LIKE '%Privilege%')
    LIMIT 1
  `).get(employeeId, currentYear);

  const earnedLeaveDays = Math.max(0, leaveBalance?.balance || 12);
  const leaveEncashmentAmount = Math.round((basicPlusDa / 30) * earnedLeaveDays);

  // 4. Notice Period Adjustment
  const noticeShortfallDays = Math.max(0, noticePeriodDays - noticeServedDays);
  const grossMonthly = baseSalary + da + (employee.hra || 0) + (employee.special_allowance || 0);
  const noticePayDeduction = Math.round((grossMonthly / 30) * noticeShortfallDays);

  // 5. Pending Salary for Final Month (up to LWD)
  const lwdDay = lwd.getDate();
  const pendingSalary = customPendingSalary !== null
    ? Number(customPendingSalary)
    : Math.round((grossMonthly / 30) * lwdDay);

  // 6. Pending Approved Expense Reimbursements
  const pendingExpenses = db.prepare(`
    SELECT SUM(amount) as total
    FROM expenses
    WHERE employee_id = ? AND status = 'Approved'
  `).get(employeeId)?.total || 0;

  // 7. Net Total Payable
  const totalPayable = Math.max(0, gratuityAmount + leaveEncashmentAmount + pendingSalary + pendingExpenses - noticePayDeduction);

  return {
    employee: {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      employee_code: employee.employee_code,
      joining_date: employee.joining_date,
      designation: employee.designation,
      department: employee.department_name,
    },
    tenure: {
      total_days: totalDays,
      years: fullYears,
      months: remainderMonths,
      gratuity_qualifying_years: gratuityYears,
      is_gratuity_eligible: isGratuityEligible,
    },
    statutory_components: {
      basic_plus_da_monthly: basicPlusDa,
      gross_monthly: grossMonthly,
      gratuity_amount: gratuityAmount,
      gratuity_formula: '15 * (Basic + DA) * Years / 26 (Payment of Gratuity Act 1972)',
      earned_leaves_days: earnedLeaveDays,
      leave_encashment_amount: leaveEncashmentAmount,
      notice_period_days: noticePeriodDays,
      notice_served_days: noticeServedDays,
      notice_shortfall_days: noticeShortfallDays,
      notice_pay_deduction: noticePayDeduction,
      pending_salary: pendingSalary,
      pending_reimbursements: pendingExpenses,
      total_payable: totalPayable,
    },
    resignation_date: resignationDate,
    last_working_day: lastWorkingDay,
  };
}
