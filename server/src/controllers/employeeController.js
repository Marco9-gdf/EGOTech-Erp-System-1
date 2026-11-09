import bcrypt from 'bcryptjs';
import db from '../config/database.js';

export function getEmployees(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;
    const { department_id, status, search, company_id } = req.query;

    let query = `
      SELECT e.*, d.name as department_name, s.name as shift_name,
             ss.base_salary, ss.provident_fund, ss.health_insurance,
             u.role as account_role, u.id as user_id, c.name as company_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN salary_structures ss ON e.id = ss.employee_id
      LEFT JOIN users u ON e.id = u.employee_id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Multi-tenant scoping: Only owner can view other companies
    if (!isOwner) {
      query += ' AND e.company_id = ?';
      params.push(userCompanyId);
    } else if (company_id) {
      query += ' AND e.company_id = ?';
      params.push(Number(company_id));
    }

    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY e.id DESC';

    const employees = db.prepare(query).all(...params);
    res.json({ employees });
  } catch (err) {
    console.error('getEmployees error:', err);
    res.status(500).json({ error: 'Failed to retrieve employees: ' + err.message });
  }
}

export function getEmployeeById(req, res) {
  try {
    const id = req.params.id;
    const empStmt = db.prepare(`
      SELECT e.*, d.name as department_name, s.name as shift_name, s.start_time as shift_start, s.end_time as shift_end,
             c.name as company_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE e.id = ?
    `);
    const employee = empStmt.get(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Salary Structure
    const salary = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ?').get(id) || null;

    // Leave Balances
    const currentYear = new Date().getFullYear();
    const leaveBalances = db.prepare(`
      SELECT lb.*, lt.name as leave_type_name, lt.is_paid, lt.color
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ?
    `).all(id, currentYear);

    // Recent Attendance (last 10 days)
    const recentAttendance = db.prepare(`
      SELECT * FROM attendance
      WHERE employee_id = ?
      ORDER BY date DESC
      LIMIT 10
    `).all(id);

    // Associated User Account
    const userAccount = db.prepare('SELECT id, email, role, status, created_at FROM users WHERE employee_id = ?').get(id) || null;

    res.json({
      employee,
      salary_structure: salary,
      leave_balances: leaveBalances,
      recent_attendance: recentAttendance,
      user_account: userAccount,
    });
  } catch (err) {
    console.error('getEmployeeById error:', err);
    res.status(500).json({ error: 'Failed to fetch employee details.' });
  }
}

export function createEmployee(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;

    const {
      first_name,
      last_name,
      email,
      phone,
      department_id,
      designation,
      joining_date,
      employment_type,
      shift_id,
      bank_name,
      bank_account_no,
      bank_ifsc,
      tax_id,
      company_id,
      // Initial Salary components
      base_salary = 3000,
      hra = 600,
      conveyance_allowance = 200,
      medical_allowance = 150,
      special_allowance = 250,
      provident_fund = 200,
      professional_tax = 50,
      health_insurance = 100,
      tds_tax = 150,
      overtime_rate_per_hour = 25,
      // User account option
      create_account = true,
      account_role = 'employee',
      account_password = 'Password123!',
    } = req.body;

    if (!first_name || !last_name || !email || !designation || !joining_date) {
      return res.status(400).json({ error: 'First name, last name, email, designation, and joining date are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check email uniqueness
    const existing = db.prepare('SELECT id FROM employees WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: `An employee with email "${cleanEmail}" already exists.` });
    }

    const targetCompanyId = isOwner && company_id ? Number(company_id) : userCompanyId;

    // Generate unique employee code
    const countRow = db.prepare('SELECT COUNT(*) as count FROM employees').get();
    const nextNum = (countRow.count || 0) + 1;
    const employee_code = `EMP${String(nextNum).padStart(4, '0')}`;

    // 1. Insert Employee
    const insertEmp = db.prepare(`
      INSERT INTO employees (
        company_id, employee_code, first_name, last_name, email, phone,
        department_id, designation, joining_date, employment_type,
        shift_id, bank_name, bank_account_no, bank_ifsc, tax_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEmp.run(
      targetCompanyId,
      employee_code,
      first_name.trim(),
      last_name.trim(),
      cleanEmail,
      phone || null,
      department_id ? Number(department_id) : null,
      designation.trim(),
      joining_date,
      employment_type || 'Full-Time',
      shift_id ? Number(shift_id) : 1,
      bank_name || null,
      bank_account_no || null,
      bank_ifsc || null,
      tax_id || null
    );

    const empIdRow = db.prepare('SELECT id FROM employees WHERE employee_code = ?').get(employee_code);
    const employeeId = empIdRow.id;

    // 2. Insert Salary Structure
    db.prepare(`
      INSERT INTO salary_structures (
        employee_id, base_salary, hra, conveyance_allowance,
        medical_allowance, special_allowance, provident_fund,
        professional_tax, health_insurance, tds_tax, overtime_rate_per_hour
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employeeId,
      Number(base_salary) || 0,
      Number(hra) || 0,
      Number(conveyance_allowance) || 0,
      Number(medical_allowance) || 0,
      Number(special_allowance) || 0,
      Number(provident_fund) || 0,
      Number(professional_tax) || 0,
      Number(health_insurance) || 0,
      Number(tds_tax) || 0,
      Number(overtime_rate_per_hour) || 0
    );

    // 3. Initialize Leave Balances for Current Year
    const currentYear = new Date().getFullYear();
    const leaveTypes = db.prepare('SELECT * FROM leave_types WHERE company_id = ?').all(targetCompanyId);
    const insertBalance = db.prepare(`
      INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
      VALUES (?, ?, ?, ?, 0)
    `);

    leaveTypes.forEach((lt) => {
      insertBalance.run(employeeId, lt.id, currentYear, lt.default_days_per_year);
    });

    // 4. Optionally create User Login Account
    if (create_account) {
      const hash = bcrypt.hashSync(account_password || 'Password123!', 10);
      const fullName = `${first_name.trim()} ${last_name.trim()}`;
      try {
        db.prepare(`
          INSERT INTO users (company_id, employee_id, name, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, ?, ?, 'Active')
        `).run(targetCompanyId, employeeId, fullName, cleanEmail, hash, account_role || 'employee');
      } catch (userErr) {
        console.warn('Could not create login account:', userErr.message);
      }
    }

    res.status(201).json({
      message: 'Employee created successfully.',
      employee_id: employeeId,
      employee_code,
    });
  } catch (err) {
    console.error('createEmployee error:', err);
    res.status(500).json({ error: 'Failed to create employee: ' + err.message });
  }
}

export function updateEmployee(req, res) {
  try {
    const id = req.params.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      department_id,
      designation,
      joining_date,
      employment_type,
      shift_id,
      status,
      bank_name,
      bank_account_no,
      bank_ifsc,
      tax_id,
    } = req.body;

    db.prepare(`
      UPDATE employees SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        department_id = COALESCE(?, department_id),
        designation = COALESCE(?, designation),
        joining_date = COALESCE(?, joining_date),
        employment_type = COALESCE(?, employment_type),
        shift_id = COALESCE(?, shift_id),
        status = COALESCE(?, status),
        bank_name = COALESCE(?, bank_name),
        bank_account_no = COALESCE(?, bank_account_no),
        bank_ifsc = COALESCE(?, bank_ifsc),
        tax_id = COALESCE(?, tax_id)
      WHERE id = ?
    `).run(
      first_name,
      last_name,
      email,
      phone,
      department_id ? Number(department_id) : null,
      designation,
      joining_date,
      employment_type,
      shift_id ? Number(shift_id) : null,
      status,
      bank_name,
      bank_account_no,
      bank_ifsc,
      tax_id,
      id
    );

    res.json({ message: 'Employee updated successfully.' });
  } catch (err) {
    console.error('updateEmployee error:', err);
    res.status(500).json({ error: 'Failed to update employee.' });
  }
}

export function updateSalaryStructure(req, res) {
  try {
    const employeeId = req.params.id;
    const {
      base_salary,
      hra,
      conveyance_allowance,
      medical_allowance,
      special_allowance,
      provident_fund,
      professional_tax,
      health_insurance,
      tds_tax,
      overtime_rate_per_hour,
    } = req.body;

    const existing = db.prepare('SELECT id FROM salary_structures WHERE employee_id = ?').get(employeeId);

    if (existing) {
      db.prepare(`
        UPDATE salary_structures SET
          base_salary = ?,
          hra = ?,
          conveyance_allowance = ?,
          medical_allowance = ?,
          special_allowance = ?,
          provident_fund = ?,
          professional_tax = ?,
          health_insurance = ?,
          tds_tax = ?,
          overtime_rate_per_hour = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `).run(
        Number(base_salary) || 0,
        Number(hra) || 0,
        Number(conveyance_allowance) || 0,
        Number(medical_allowance) || 0,
        Number(special_allowance) || 0,
        Number(provident_fund) || 0,
        Number(professional_tax) || 0,
        Number(health_insurance) || 0,
        Number(tds_tax) || 0,
        Number(overtime_rate_per_hour) || 0,
        employeeId
      );
    } else {
      db.prepare(`
        INSERT INTO salary_structures (
          employee_id, base_salary, hra, conveyance_allowance,
          medical_allowance, special_allowance, provident_fund,
          professional_tax, health_insurance, tds_tax, overtime_rate_per_hour
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        employeeId,
        Number(base_salary) || 0,
        Number(hra) || 0,
        Number(conveyance_allowance) || 0,
        Number(medical_allowance) || 0,
        Number(special_allowance) || 0,
        Number(provident_fund) || 0,
        Number(professional_tax) || 0,
        Number(health_insurance) || 0,
        Number(tds_tax) || 0,
        Number(overtime_rate_per_hour) || 0
      );
    }

    res.json({ message: 'Salary structure updated successfully.' });
  } catch (err) {
    console.error('updateSalaryStructure error:', err);
    res.status(500).json({ error: 'Failed to update salary structure.' });
  }
}

export function deleteEmployee(req, res) {
  try {
    const id = req.params.id;
    db.prepare("UPDATE employees SET status = 'Inactive' WHERE id = ?").run(id);
    db.prepare("UPDATE users SET status = 'Suspended' WHERE employee_id = ?").run(id);
    res.json({ message: 'Employee set to Inactive status.' });
  } catch (err) {
    console.error('deleteEmployee error:', err);
    res.status(500).json({ error: 'Failed to deactivate employee.' });
  }
}

export function getDepartments(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;
    const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : (isOwner ? 1 : userCompanyId);

    let query = `
      SELECT d.*, COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      WHERE d.company_id = ?
    `;
    const params = [targetCompanyId];

    query += ' GROUP BY d.id ORDER BY d.name ASC';

    const departments = db.prepare(query).all(...params);
    res.json({ departments });
  } catch (err) {
    console.error('getDepartments error:', err);
    res.status(500).json({ error: 'Failed to get departments.' });
  }
}

export function getShifts(req, res) {
  try {
    const isOwner = req.user.role === 'owner';
    const userCompanyId = req.currentUser.company_id || 1;
    const targetCompanyId = req.query.company_id ? Number(req.query.company_id) : (isOwner ? 1 : userCompanyId);

    const shifts = db.prepare('SELECT * FROM shifts WHERE company_id = ? ORDER BY id ASC').all(targetCompanyId);
    res.json({ shifts });
  } catch (err) {
    console.error('getShifts error:', err);
    res.status(500).json({ error: 'Failed to get shifts.' });
  }
}
