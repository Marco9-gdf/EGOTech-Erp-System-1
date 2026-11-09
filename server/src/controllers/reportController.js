import db from '../config/database.js';

export function getAttendanceReport(req, res) {
  try {
    const { month, year, department_id, format } = req.query;
    const currentMonth = Number(month) || (new Date().getMonth() + 1);
    const currentYear = Number(year) || new Date().getFullYear();

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    let empQuery = `
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.designation, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'Active'
    `;
    const params = [];
    if (department_id) {
      empQuery += ' AND e.department_id = ?';
      params.push(department_id);
    }
    empQuery += ' ORDER BY e.first_name ASC';

    const employees = db.prepare(empQuery).all(...params);

    const report = employees.map((emp) => {
      const stats = db.prepare(`
        SELECT
          COUNT(id) as recorded_days,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_days,
          SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_days,
          SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) as leave_days,
          SUM(working_hours) as total_hours,
          SUM(overtime_hours) as total_ot_hours
        FROM attendance
        WHERE employee_id = ? AND date >= ? AND date <= ?
      `).get(emp.id, startDate, endDate);

      const presentScore = (stats.present_days || 0) + (stats.half_days || 0) * 0.5;

      return {
        employee_id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department_name || 'N/A',
        designation: emp.designation,
        present_days: stats.present_days || 0,
        half_days: stats.half_days || 0,
        late_days: stats.late_days || 0,
        leave_days: stats.leave_days || 0,
        total_hours: Math.round((stats.total_hours || 0) * 10) / 10,
        total_ot_hours: Math.round((stats.total_ot_hours || 0) * 10) / 10,
        attendance_rate: daysInMonth > 0 ? Math.round((presentScore / 22) * 100) : 0,
      };
    });

    if (format === 'csv') {
      const headers = ['Employee Code', 'Name', 'Department', 'Designation', 'Present Days', 'Half Days', 'Late Marks', 'Leaves', 'Total Hours', 'OT Hours'];
      const rows = report.map(r => [
        `"${r.employee_code}"`,
        `"${r.name}"`,
        `"${r.department}"`,
        `"${r.designation}"`,
        r.present_days,
        r.half_days,
        r.late_days,
        r.leave_days,
        r.total_hours,
        r.total_ot_hours,
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${currentMonth}-${currentYear}.csv"`);
      return res.send(csvContent);
    }

    res.json({
      month: currentMonth,
      year: currentYear,
      report,
    });
  } catch (err) {
    console.error('getAttendanceReport error:', err);
    res.status(500).json({ error: 'Failed to generate attendance report.' });
  }
}

export function getPayrollReport(req, res) {
  try {
    const { year = new Date().getFullYear(), format } = req.query;

    const batches = db.prepare(`
      SELECT pb.*, COUNT(ps.id) as staff_count
      FROM payroll_batches pb
      LEFT JOIN payslips ps ON pb.id = ps.payroll_batch_id
      WHERE pb.year = ?
      GROUP BY pb.id
      ORDER BY pb.month ASC
    `).all(Number(year));

    if (format === 'csv') {
      const headers = ['Month', 'Year', 'Batch Name', 'Status', 'Staff Count', 'Gross Total', 'Deductions Total', 'Net Disbursed', 'Payment Date'];
      const rows = batches.map(b => [
        b.month,
        b.year,
        `"${b.batch_name}"`,
        `"${b.status}"`,
        b.staff_count,
        b.total_gross,
        b.total_deductions,
        b.total_net,
        `"${b.payment_date || 'Pending'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-report-${year}.csv"`);
      return res.send(csvContent);
    }

    res.json({ year: Number(year), batches });
  } catch (err) {
    console.error('getPayrollReport error:', err);
    res.status(500).json({ error: 'Failed to generate payroll report.' });
  }
}
