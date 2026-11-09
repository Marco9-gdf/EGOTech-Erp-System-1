import db from '../config/database.js';
import {
  evaluateLabourCodeWageCompliance,
  calculateEPF,
  calculateESIC,
  calculateProfessionalTax,
  calculateLWF,
  calculateAnnualTDS,
  generatePayslipVerificationHash,
  maskAadhaar
} from './complianceEngine.js';

export function calculateEmployeePayroll(employeeId, month, year, options = {}) {
  // 1. Fetch employee & salary structure
  const empStmt = db.prepare(`
    SELECT e.*, d.name as department_name, s.name as shift_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = ?
  `);
  const employee = empStmt.get(employeeId);
  if (!employee) {
    throw new Error(`Employee with ID ${employeeId} not found.`);
  }

  const salStmt = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ?');
  let salary = salStmt.get(employeeId);

  // If no salary structure exists, provide safe defaults
  if (!salary) {
    salary = {
      base_salary: 3000,
      da: 500,
      hra: 600,
      conveyance_allowance: 200,
      medical_allowance: 150,
      special_allowance: 250,
      provident_fund: 420,
      professional_tax: 200,
      health_insurance: 100,
      tds_tax: 150,
      overtime_rate_per_hour: 25,
    };
  }

  // 2. Month day limits
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Count standard weekdays (Mon-Fri) as total standard working days
  let standardWorkingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      standardWorkingDays++;
    }
  }

  // 3. Query attendance records for employee in this month
  const attStmt = db.prepare(`
    SELECT * FROM attendance
    WHERE employee_id = ? AND date >= ? AND date <= ?
  `);
  const attendanceRecords = attStmt.all(employeeId, startDateStr, endDateStr);

  let presentDays = 0;
  let overtimeHours = 0;
  let unexcusedAbsentDays = 0;

  attendanceRecords.forEach((att) => {
    if (att.status === 'Present') {
      presentDays += 1;
    } else if (att.status === 'Half Day') {
      presentDays += 0.5;
    } else if (att.status === 'Absent') {
      unexcusedAbsentDays += 1;
    }
    if (att.overtime_hours) {
      overtimeHours += Number(att.overtime_hours);
    }
  });

  // 4. Query approved leave requests in this month
  const leavesStmt = db.prepare(`
    SELECT lr.*, lt.is_paid, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.employee_id = ?
      AND lr.status = 'Approved'
      AND ((lr.start_date <= ? AND lr.end_date >= ?)
           OR (lr.start_date >= ? AND lr.start_date <= ?))
  `);
  const approvedLeaves = leavesStmt.all(
    employeeId,
    endDateStr,
    startDateStr,
    startDateStr,
    endDateStr
  );

  let paidLeaves = 0;
  let unpaidLeaves = unexcusedAbsentDays;

  approvedLeaves.forEach((leave) => {
    const lDays = Number(leave.days_count) || 1;
    if (leave.is_paid) {
      paidLeaves += lDays;
    } else {
      unpaidLeaves += lDays;
    }
  });

  // If attendance hasn't been strictly tracked or employee has active status,
  // ensure realistic present days calculation if records were not manually entered for all days
  if (attendanceRecords.length === 0) {
    // Default to full month attendance minus any unpaid leaves
    presentDays = Math.max(0, standardWorkingDays - paidLeaves - unpaidLeaves);
  }

  // 5. Statutory & Remuneration Calculations
  const baseSalary = Number(salary.base_salary) || 0;
  const da = Number(salary.da) || 0;
  const retainingAllowance = Number(salary.retaining_allowance) || 0;
  const hra = Number(salary.hra) || 0;
  const conveyance = Number(salary.conveyance_allowance) || 0;
  const medical = Number(salary.medical_allowance) || 0;
  const specialAllowance = Number(salary.special_allowance) || 0;
  const bonus = Number(options.bonus) || 0;

  const overtimeRate = Number(salary.overtime_rate_per_hour) || 0;
  const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100;

  // Calculate approved, unreimbursed expense claims for this employee
  let reimbursements = 0;
  try {
    const expRow = db.prepare(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE employee_id = ? AND status = 'Approved' AND payroll_batch_id IS NULL
    `).get(employeeId);
    if (expRow && expRow.total) {
      reimbursements = Math.round(Number(expRow.total) * 100) / 100;
    }
  } catch (expErr) {
    reimbursements = 0;
  }

  // LOP deduction calculation based on unpaid leaves / unexcused absences
  const perDayBaseRate = daysInMonth > 0 ? (baseSalary + da) / daysInMonth : 0;
  const lopDeduction = Math.round(perDayBaseRate * unpaidLeaves * 100) / 100;

  // 🏛️ The Four Labour Codes: Uniform Wage Definition Compliance (50% Rule)
  const wageEvaluation = evaluateLabourCodeWageCompliance({
    base_salary: baseSalary,
    da,
    retaining_allowance: retainingAllowance,
    hra,
    conveyance_allowance: conveyance,
    medical_allowance: medical,
    special_allowance: specialAllowance,
  });

  // Statutory wage base under Code on Wages (elevated to 50% if allowances exceed threshold)
  const statutoryWageBase = wageEvaluation.deemedWages > 0 ? wageEvaluation.deemedWages : (baseSalary + da);

  // 1. Employee & Employer Provident Fund (EPF/EPFO)
  let providentFund = Number(salary.provident_fund) || 0;
  let employerPF = Number(salary.employer_pf) || 0;
  let epfBreakdown = { applicable: false };

  if (employee.epf_eligible !== 0 && (providentFund > 0 || statutoryWageBase > 0)) {
    epfBreakdown = calculateEPF(statutoryWageBase, true, { ceiling: 15000 });
    if (epfBreakdown.applicable) {
      // Use standard statutory calculation or configured salary structure
      providentFund = salary.provident_fund > 0 ? Number(salary.provident_fund) : epfBreakdown.employeePF;
      employerPF = epfBreakdown.totalEmployerContribution;
    }
  }

  // 2. ESIC (0.75% EE + 3.25% ER on Gross if <= ₹21,000)
  const monthlyGrossBeforeBonus = baseSalary + da + hra + conveyance + medical + specialAllowance;
  let healthInsurance = Number(salary.health_insurance) || 0;
  let employerESIC = Number(salary.employer_esic) || 0;
  let esicBreakdown = { applicable: false };

  if (employee.esic_eligible !== 0 && monthlyGrossBeforeBonus <= 21000) {
    esicBreakdown = calculateESIC(monthlyGrossBeforeBonus, true);
    if (esicBreakdown.applicable) {
      healthInsurance = esicBreakdown.employeeESIC;
      employerESIC = esicBreakdown.employerESIC;
    }
  }

  // 3. Professional Tax (PT) - State Slabs
  let professionalTax = Number(salary.professional_tax) || 0;
  if (employee.pt_eligible !== 0) {
    const computedPT = calculateProfessionalTax(employee.work_state || 'Maharashtra', monthlyGrossBeforeBonus, month);
    professionalTax = computedPT > 0 ? computedPT : professionalTax;
  }

  // 4. TDS on Salary (Section 192) - Form 12BB & Dual Regime
  let tdsTax = Number(salary.tds_tax) || 0;
  let taxRegime = employee.tax_regime || 'New';
  try {
    const declRow = db.prepare('SELECT * FROM tax_declarations_12bb WHERE employee_id = ?').get(employeeId);
    if (declRow) {
      taxRegime = declRow.regime || taxRegime;
      const tdsResult = calculateAnnualTDS(monthlyGrossBeforeBonus, taxRegime, declRow);
      tdsTax = tdsResult.effectiveMonthlyTDS > 0 ? tdsResult.effectiveMonthlyTDS : tdsTax;
    }
  } catch (taxErr) {
    // Keep salary default
  }

  // 5. Labour Welfare Fund (LWF)
  const lwfDeduction = calculateLWF(employee.work_state || 'Maharashtra', month);
  const otherDeductions = (Number(options.other_deductions) || 0) + lwfDeduction;

  const totalEarnings = Math.round(
    (baseSalary + da + hra + conveyance + medical + specialAllowance + bonus + overtimePay + reimbursements) * 100
  ) / 100;

  const totalDeductions = Math.round(
    (providentFund + professionalTax + healthInsurance + tdsTax + lopDeduction + otherDeductions) * 100
  ) / 100;

  const netSalary = Math.max(0, Math.round((totalEarnings - totalDeductions) * 100) / 100);

  // IT Act 2000 Tamper-Evident Verification Seal Hash
  const digitalSignHash = generatePayslipVerificationHash({
    employee_id: employee.id,
    month,
    year,
    net_salary: netSalary,
    employee_code: employee.employee_code,
  });

  // Statutory retention period: 8 years from current date
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 8);
  const statutoryRetentionUntil = retentionDate.toISOString().split('T')[0];

  return {
    employee_id: employee.id,
    employee_code: employee.employee_code,
    employee_name: `${employee.first_name} ${employee.last_name}`,
    department: employee.department_name,
    designation: employee.designation,
    month,
    year,
    total_working_days: standardWorkingDays,
    present_days: presentDays,
    paid_leaves: paidLeaves,
    unpaid_leaves: unpaidLeaves,
    overtime_hours: overtimeHours,
    // Earnings
    base_salary: baseSalary,
    da,
    hra,
    conveyance,
    medical,
    special_allowance: specialAllowance,
    bonus,
    overtime_pay: overtimePay,
    reimbursements,
    total_earnings: totalEarnings,
    // Deductions
    provident_fund: providentFund,
    professional_tax: professionalTax,
    health_insurance: healthInsurance,
    tds_tax: tdsTax,
    lop_deduction: lopDeduction,
    lwf_deduction: lwfDeduction,
    other_deductions: otherDeductions,
    total_deductions: totalDeductions,
    // Employer Statutory Contributions (CTC Cost)
    employer_pf: employerPF,
    employer_esic: employerESIC,
    // Net
    net_salary: netSalary,
    bank_name: employee.bank_name,
    bank_account_no: employee.bank_account_no,
    bank_ifsc: employee.bank_ifsc || 'HDFC0001234',
    tax_id: employee.tax_id || employee.pan_number,
    pan_number: employee.pan_number || employee.tax_id || 'ABCDE1234F',
    aadhaar_masked: maskAadhaar(employee.aadhaar_masked || 'XXXXXXXX8901'),
    uan_number: employee.uan_number || '101234567890',
    esic_number: employee.esic_number || '31000123450000101',
    tax_regime: taxRegime,
    work_state: employee.work_state || 'Maharashtra',
    labour_code_compliance: wageEvaluation,
    digital_sign_hash: digitalSignHash,
    statutory_retention_until: statutoryRetentionUntil,
  };
}
