import bcrypt from 'bcryptjs';
import db, { initDatabase } from '../config/database.js';
import { calculateEmployeePayroll } from '../services/payrollEngine.js';

initDatabase();

console.log('🌱 Seeding Egotech SaaS Platform Database...');

// 1. Companies Table (Multi-Tenant Support with White-Label Co-Branding)
db.prepare('DELETE FROM companies').run();
const insertCompany = db.prepare(`
  INSERT INTO companies (
    id, name, code, email, phone, address, currency_symbol, currency_code, plan, status, max_employees,
    logo_url, primary_color, powered_by_text, custom_tagline
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertCompany.run(
  1,
  'Egotech Technologies Inc.',
  'EGOTECH',
  'contact@egotech.com',
  '+1 (555) 019-2834',
  '100 Innovation Way, Suite 400, Silicon Valley, CA 94025',
  '$',
  'USD',
  'Enterprise',
  'Active',
  250,
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
  '#4f46e5',
  'Powered by Egotech',
  'Enterprise Workforce & Real-time Payroll Automation'
);

// 2. Departments
db.prepare('DELETE FROM departments').run();
const departments = [
  { companyId: 1, name: 'Engineering', code: 'ENG', description: 'Software Development & Infrastructure' },
  { companyId: 1, name: 'Human Resources', code: 'HR', description: 'People, Culture & Payroll' },
  { companyId: 1, name: 'Product & Design', code: 'PRD', description: 'UI/UX & Product Management' },
  { companyId: 1, name: 'Finance & Accounts', code: 'FIN', description: 'Financial Planning & Accounting' },
  { companyId: 1, name: 'Sales & Marketing', code: 'SLS', description: 'Growth, Marketing & Enterprise Sales' },
];

const insertDept = db.prepare('INSERT INTO departments (company_id, name, code, description) VALUES (?, ?, ?, ?)');
departments.forEach((d) => insertDept.run(d.companyId, d.name, d.code, d.description));

// 3. Shifts
db.prepare('DELETE FROM shifts').run();
const shifts = [
  { companyId: 1, name: 'Standard Day Shift', start_time: '09:00:00', end_time: '18:00:00', grace: 15, half: 4.0, full: 8.0 },
  { companyId: 1, name: 'Morning Shift', start_time: '07:00:00', end_time: '15:30:00', grace: 10, half: 4.0, full: 8.0 },
  { companyId: 1, name: 'Evening Shift', start_time: '14:00:00', end_time: '22:30:00', grace: 15, half: 4.0, full: 8.0 },
  // Company 2 shift
  { companyId: 2, name: 'Flexi Day Shift', start_time: '09:30:00', end_time: '18:30:00', grace: 20, half: 4.0, full: 8.0 },
  // Company 3 shift
  { companyId: 3, name: 'Redmond Core Shift', start_time: '09:00:00', end_time: '18:00:00', grace: 15, half: 4.0, full: 8.0 },
];
const insertShift = db.prepare(`
  INSERT INTO shifts (company_id, name, start_time, end_time, grace_period_minutes, half_day_hours, full_day_hours)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
shifts.forEach((s) => insertShift.run(s.companyId, s.name, s.start_time, s.end_time, s.grace, s.half, s.full));

// 4. Leave Types
db.prepare('DELETE FROM leave_types').run();
const leaveTypes = [
  { companyId: 1, name: 'Paid / Annual Leave', code: 'PL', days: 18, is_paid: 1, color: '#3b82f6' },
  { companyId: 1, name: 'Sick Leave', code: 'SL', days: 10, is_paid: 1, color: '#ef4444' },
  { companyId: 1, name: 'Casual Leave', code: 'CL', days: 7, is_paid: 1, color: '#10b981' },
  { companyId: 1, name: 'Unpaid Leave (LOP)', code: 'LOP', days: 30, is_paid: 0, color: '#f59e0b' },
  // Company 2 leave types
  { companyId: 2, name: 'Paid Vacation', code: 'PV', days: 20, is_paid: 1, color: '#3b82f6' },
  { companyId: 2, name: 'Sick Time', code: 'ST', days: 10, is_paid: 1, color: '#ef4444' },
  // Company 3 leave types
  { companyId: 3, name: 'Microsoft PTO', code: 'PTO', days: 25, is_paid: 1, color: '#0078d4' },
  { companyId: 3, name: 'Medical Leave', code: 'MED', days: 15, is_paid: 1, color: '#ef4444' },
  { companyId: 3, name: 'Volunteer Days', code: 'VOL', days: 5, is_paid: 1, color: '#10b981' },
];
const insertLT = db.prepare('INSERT INTO leave_types (company_id, name, code, default_days_per_year, is_paid, color) VALUES (?, ?, ?, ?, ?, ?)');
leaveTypes.forEach((lt) => insertLT.run(lt.companyId, lt.name, lt.code, lt.days, lt.is_paid, lt.color));

// 5. Clean out dependent tables
db.prepare('DELETE FROM users').run();
db.prepare('DELETE FROM salary_structures').run();
db.prepare('DELETE FROM attendance').run();
db.prepare('DELETE FROM leave_balances').run();
db.prepare('DELETE FROM leave_requests').run();
db.prepare('DELETE FROM payslips').run();
db.prepare('DELETE FROM payroll_batches').run();
db.prepare('DELETE FROM employees').run();

// 6. Platform Owner Account (Superadmin / SaaS Vendor)
console.log('👑 Seeding Platform Owner Accounts...');
const masterPassword = '826999';
const ownerHash = bcrypt.hashSync(masterPassword, 10);
db.prepare(`
  INSERT INTO users (company_id, name, email, password_hash, role, status)
  VALUES (1, 'Harsh Shrivastava (Platform Owner)', 'khiladiharsh786@gmail.com', ?, 'owner', 'Active')
`).run(ownerHash);

db.prepare(`
  INSERT INTO users (company_id, name, email, password_hash, role, status)
  VALUES (1, 'Egotech Platform Owner', 'owner@egotech.com', ?, 'owner', 'Active')
`).run(ownerHash);

db.prepare(`
  INSERT INTO users (company_id, name, email, password_hash, role, status)
  VALUES (1, 'Egotech Admin', 'admin@egotech.com', ?, 'admin', 'Active')
`).run(ownerHash);

db.prepare(`
  INSERT INTO users (company_id, name, email, password_hash, role, status)
  VALUES (1, 'Platform Owner (SaaS Vendor)', 'owner@platform.com', ?, 'owner', 'Active')
`).run(ownerHash);

// 7. Seed Staff for Company 1
const seedStaff = [
  {
    companyId: 1,
    code: 'EMP0001',
    first: 'Alexander',
    last: 'Wright',
    email: 'admin@company.com',
    password: '826999',
    role: 'admin',
    deptId: 1,
    designation: 'VP of Technology & Systems',
    joined: '2022-01-15',
    salary: { base: 8500, hra: 1700, conv: 350, med: 250, spec: 600, pf: 500, pt: 100, hi: 150, tax: 950, otRate: 60 },
    bank: 'JPMorgan Chase',
    acc: '9845112349',
    pan: 'AW982348X',
  },
  {
    companyId: 1,
    code: 'EMP0002',
    first: 'Eleanor',
    last: 'Vance',
    email: 'hr@company.com',
    password: '826999',
    role: 'hr',
    deptId: 2,
    designation: 'Head of Human Resources',
    joined: '2022-04-01',
    salary: { base: 6200, hra: 1200, conv: 250, med: 200, spec: 400, pf: 400, pt: 80, hi: 120, tax: 550, otRate: 45 },
    bank: 'Bank of America',
    acc: '4452109831',
    pan: 'EV491029Y',
  },
  {
    companyId: 1,
    code: 'EMP0003',
    first: 'John',
    last: 'Doe',
    email: 'john.doe@company.com',
    password: '826999',
    role: 'employee',
    deptId: 1,
    designation: 'Senior Full-Stack Engineer',
    joined: '2023-02-10',
    salary: { base: 5500, hra: 1100, conv: 200, med: 150, spec: 350, pf: 350, pt: 70, hi: 100, tax: 450, otRate: 40 },
    bank: 'Wells Fargo',
    acc: '1122334455',
    pan: 'JD382910Z',
  },
  {
    companyId: 1,
    code: 'EMP0004',
    first: 'Sarah',
    last: 'Jenkins',
    email: 'sarah.jenkins@company.com',
    password: '826999',
    role: 'employee',
    deptId: 3,
    designation: 'Lead Product Designer',
    joined: '2023-06-15',
    salary: { base: 5000, hra: 1000, conv: 200, med: 150, spec: 300, pf: 300, pt: 60, hi: 100, tax: 380, otRate: 35 },
    bank: 'Citibank',
    acc: '7766554433',
    pan: 'SJ581902K',
  },
  {
    companyId: 1,
    code: 'EMP0005',
    first: 'Marcus',
    last: 'Chen',
    email: 'marcus.chen@company.com',
    password: '826999',
    role: 'employee',
    deptId: 1,
    designation: 'DevOps & Cloud Architect',
    joined: '2023-08-20',
    salary: { base: 5800, hra: 1150, conv: 200, med: 150, spec: 400, pf: 380, pt: 70, hi: 110, tax: 480, otRate: 42 },
    bank: 'Chase Bank',
    acc: '9988776655',
    pan: 'MC441920L',
  },
  {
    companyId: 1,
    code: 'EMP0006',
    first: 'Priya',
    last: 'Sharma',
    email: 'priya.sharma@company.com',
    password: '826999',
    role: 'employee',
    deptId: 4,
    designation: 'Senior Financial Analyst',
    joined: '2023-11-01',
    salary: { base: 4800, hra: 950, conv: 200, med: 150, spec: 250, pf: 300, pt: 60, hi: 100, tax: 350, otRate: 35 },
    bank: 'Capital One',
    acc: '3344556677',
    pan: 'PS712839M',
  },
  {
    companyId: 1,
    code: 'EMP0007',
    first: 'Alex',
    last: 'Rivera',
    email: 'alex.rivera@company.com',
    password: '826999',
    role: 'employee',
    deptId: 5,
    designation: 'Growth Marketing Director',
    joined: '2024-01-10',
    salary: { base: 5200, hra: 1050, conv: 200, med: 150, spec: 300, pf: 320, pt: 65, hi: 100, tax: 400, otRate: 38 },
    bank: 'HSBC',
    acc: '5566778899',
    pan: 'AR991023N',
  },
];

const deptsInDb = db.prepare('SELECT id, code FROM departments WHERE company_id = 1').all();
const deptMap = {};
deptsInDb.forEach(d => { deptMap[d.code] = d.id; });

const firstShift = db.prepare('SELECT id FROM shifts WHERE company_id = 1 LIMIT 1').get();
const defaultShiftId = firstShift ? firstShift.id : 1;

const insertEmp = db.prepare(`
  INSERT INTO employees (
    company_id, employee_code, first_name, last_name, email, phone,
    department_id, designation, joining_date, shift_id,
    bank_name, bank_account_no, tax_id, status
  ) VALUES (?, ?, ?, ?, ?, '+1 (555) 234-5678', ?, ?, ?, ?, ?, ?, ?, 'Active')
`);

const insertUser = db.prepare(`
  INSERT INTO users (company_id, employee_id, name, email, password_hash, role, status)
  VALUES (?, ?, ?, ?, ?, ?, 'Active')
`);

const insertSalary = db.prepare(`
  INSERT INTO salary_structures (
    employee_id, base_salary, hra, conveyance_allowance,
    medical_allowance, special_allowance, provident_fund,
    professional_tax, health_insurance, tds_tax, overtime_rate_per_hour
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBal = db.prepare(`
  INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
  VALUES (?, ?, 2026, ?, ?)
`);

const company1LeaveTypes = db.prepare('SELECT * FROM leave_types WHERE company_id = 1').all();
const createdEmployees = [];

const deptCodes = ['ENG', 'HR', 'ENG', 'PRD', 'ENG', 'FIN', 'SLS'];

seedStaff.forEach((s, idx) => {
  const actualDeptId = deptMap[deptCodes[idx]] || deptsInDb[0]?.id;
  insertEmp.run(
    s.companyId,
    s.code,
    s.first,
    s.last,
    s.email,
    actualDeptId,
    s.designation,
    s.joined,
    defaultShiftId,
    s.bank,
    s.acc,
    s.pan
  );

  const empRow = db.prepare('SELECT id FROM employees WHERE employee_code = ?').get(s.code);
  const empId = empRow.id;
  createdEmployees.push({ ...s, id: empId });

  // User
  const passHash = bcrypt.hashSync(s.password, 10);
  const fullName = `${s.first} ${s.last}`;
  insertUser.run(s.companyId, empId, fullName, s.email, passHash, s.role);

  // Salary
  insertSalary.run(
    empId,
    s.salary.base,
    s.salary.hra,
    s.salary.conv,
    s.salary.med,
    s.salary.spec,
    s.salary.pf,
    s.salary.pt,
    s.salary.hi,
    s.salary.tax,
    s.salary.otRate
  );

  // Leave balances
  company1LeaveTypes.forEach((lt) => {
    let used = 0;
    if (lt.code === 'PL') used = 3;
    if (lt.code === 'SL') used = 1;
    insertBal.run(empId, lt.id, lt.default_days_per_year, used);
  });
});

// 8. Attendance records for current month (October 2026)
console.log('📅 Generating realistic attendance history for Company 1...');
const insertAtt = db.prepare(`
  INSERT INTO attendance (
    employee_id, date, clock_in, clock_out, working_hours,
    overtime_hours, status, is_late, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let d = 1; d <= 25; d++) {
  const dateObj = new Date(2026, 9, d);
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) continue;

  const dateStr = dateObj.toISOString().split('T')[0];

  createdEmployees.forEach((emp, idx) => {
    if (d === 20 && emp.code === 'EMP0004') {
      insertAtt.run(emp.id, dateStr, '09:00:00', '13:00:00', 4.0, 0, 'Half Day', 0, 'Medical appointment');
    } else if (d === 15 && emp.code === 'EMP0003') {
      insertAtt.run(emp.id, dateStr, '09:35:00', '18:35:00', 8.0, 0, 'Present', 1, 'Traffic delay');
    } else if (d === 22 && emp.code === 'EMP0005') {
      insertAtt.run(emp.id, dateStr, '08:50:00', '20:50:00', 11.0, 3.0, 'Present', 0, 'Server migration & deployment');
    } else if (d === 18 && emp.code === 'EMP0006') {
      insertAtt.run(emp.id, dateStr, null, null, 0, 0, 'On Leave', 0, 'Approved Paid Leave');
    } else {
      const inMinute = 50 + (idx % 8);
      const inTime = `08:${String(inMinute).padStart(2, '0')}:00`;
      const outTime = '18:05:00';
      insertAtt.run(emp.id, dateStr, inTime, outTime, 8.2, 0.2, 'Present', 0, 'Standard shift');
    }
  });
}

// 9. Leave Requests
const paidLeaveType = db.prepare("SELECT id FROM leave_types WHERE code = 'PL' AND company_id = 1").get();
const adminUserRow = db.prepare("SELECT id FROM users WHERE email = 'admin@company.com'").get();
const adminUserId = adminUserRow ? adminUserRow.id : null;

db.prepare(`
  INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, reviewed_by, review_notes)
  VALUES (1, ?, ?, '2026-10-18', '2026-10-18', 1, 'Family engagement', 'Approved', ?, 'Approved by Admin')
`).run(createdEmployees[5].id, paidLeaveType.id, adminUserId);

db.prepare(`
  INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status)
  VALUES (1, ?, ?, '2026-10-28', '2026-10-29', 2, 'Attending Tech Conference', 'Pending')
`).run(createdEmployees[2].id, paidLeaveType.id);

// 10. Previous Month Payroll Batch (September 2026 - Paid)
console.log('💰 Generating September 2026 Payroll...');
db.prepare(`
  INSERT INTO payroll_batches (company_id, month, year, batch_name, status, total_gross, total_deductions, total_net, payment_date, notes)
  VALUES (1, 9, 2026, 'September 2026 Payroll Run', 'Paid', 0, 0, 0, '2026-09-30', 'Successfully disbursed to bank accounts')
`).run();

const sepBatchId = db.prepare('SELECT id FROM payroll_batches WHERE company_id = 1 AND month = 9 AND year = 2026').get().id;
let sepGross = 0;
let sepDeductions = 0;
let sepNet = 0;

const upsertPayslip = db.prepare(`
  INSERT INTO payslips (
    payroll_batch_id, employee_id, month, year,
    base_salary, hra, conveyance, medical, special_allowance,
    bonus, overtime_pay, total_earnings,
    provident_fund, professional_tax, health_insurance, tds_tax,
    lop_deduction, other_deductions, total_deductions, net_salary,
    total_working_days, present_days, paid_leaves, unpaid_leaves,
    overtime_hours, status
  ) VALUES (
    ?, ?, 9, 2026,
    ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    22, 22, 0, 0,
    ?, 'Paid'
  )
`);

createdEmployees.forEach((emp) => {
  const p = calculateEmployeePayroll(emp.id, 9, 2026);
  upsertPayslip.run(
    sepBatchId,
    emp.id,
    p.base_salary,
    p.hra,
    p.conveyance,
    p.medical,
    p.special_allowance,
    p.bonus,
    p.overtime_pay,
    p.total_earnings,
    p.provident_fund,
    p.professional_tax,
    p.health_insurance,
    p.tds_tax,
    p.lop_deduction,
    p.other_deductions,
    p.total_deductions,
    p.net_salary,
    p.overtime_hours
  );
  sepGross += p.total_earnings;
  sepDeductions += p.total_deductions;
  sepNet += p.net_salary;
});

db.prepare(`
  UPDATE payroll_batches SET
    total_gross = ?,
    total_deductions = ?,
    total_net = ?
  WHERE id = ?
`).run(sepGross, sepDeductions, sepNet, sepBatchId);

// 11. Current Month Payroll Batch (October 2026 - Draft)
console.log('📝 Generating October 2026 Draft Payroll Batch...');
db.prepare(`
  INSERT INTO payroll_batches (company_id, month, year, batch_name, status, total_gross, total_deductions, total_net, notes)
  VALUES (1, 10, 2026, 'October 2026 Payroll Run', 'Draft', 0, 0, 0, 'Ready for HR verification and disbursement')
`).run();

const octBatchId = db.prepare('SELECT id FROM payroll_batches WHERE company_id = 1 AND month = 10 AND year = 2026').get().id;
let octGross = 0;
let octDeductions = 0;
let octNet = 0;

const upsertOctPayslip = db.prepare(`
  INSERT INTO payslips (
    payroll_batch_id, employee_id, month, year,
    base_salary, hra, conveyance, medical, special_allowance,
    bonus, overtime_pay, total_earnings,
    provident_fund, professional_tax, health_insurance, tds_tax,
    lop_deduction, other_deductions, total_deductions, net_salary,
    total_working_days, present_days, paid_leaves, unpaid_leaves,
    overtime_hours, status
  ) VALUES (
    ?, ?, 10, 2026,
    ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, 'Generated'
  )
`);

createdEmployees.forEach((emp) => {
  const p = calculateEmployeePayroll(emp.id, 10, 2026);
  upsertOctPayslip.run(
    octBatchId,
    emp.id,
    p.base_salary,
    p.hra,
    p.conveyance,
    p.medical,
    p.special_allowance,
    p.bonus,
    p.overtime_pay,
    p.total_earnings,
    p.provident_fund,
    p.professional_tax,
    p.health_insurance,
    p.tds_tax,
    p.lop_deduction,
    p.other_deductions,
    p.total_deductions,
    p.net_salary,
    p.total_working_days,
    p.present_days,
    p.paid_leaves,
    p.unpaid_leaves,
    p.overtime_hours
  );
  octGross += p.total_earnings;
  octDeductions += p.total_deductions;
  octNet += p.net_salary;
});

db.prepare(`
  UPDATE payroll_batches SET
    total_gross = ?,
    total_deductions = ?,
    total_net = ?
  WHERE id = ?
`).run(octGross, octDeductions, octNet, octBatchId);

console.log('✅ Egotech Database seeded successfully!');
console.log('==================================================');
console.log('PLATFORM ACCOUNTS READY TO USE (Password: 826999):');
console.log('👑 Platform Owner:             khiladiharsh786@gmail.com / 826999');
console.log('👑 Egotech Owner:              owner@egotech.com / 826999');
console.log('🏢 Operations Admin:           admin@egotech.com / 826999');
console.log('🏢 Company Admin:              admin@company.com / 826999');
console.log('💼 HR Manager:                 hr@company.com / 826999');
console.log('👤 Employee (John Doe):        john.doe@company.com / 826999');
console.log('==================================================');
