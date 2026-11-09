import db from '../config/database.js';

export function getDashboardStats(req, res) {
  try {
    const role = req.user.role;
    const isOwner = role === 'owner';
    const isHrOrAdmin = ['admin', 'hr'].includes(role);
    const userCompanyId = req.currentUser.company_id || 1;
    const today = new Date().toISOString().split('T')[0];

    // -------------------------------------------------------------------------
    // 1. SAAS PLATFORM OWNER DASHBOARD
    // -------------------------------------------------------------------------
    if (isOwner) {
      const clientCount = db.prepare('SELECT COUNT(*) as count FROM companies WHERE id != 1').get().count || 0;
      const activeClients = db.prepare("SELECT COUNT(*) as count FROM companies WHERE id != 1 AND status = 'Active'").get().count || 0;
      const totalStaff = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'").get().count || 0;
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count || 0;

      const clientCompanies = db.prepare(`
        SELECT c.*,
               (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.status = 'Active') as staff_count,
               (SELECT u.name FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_name,
               (SELECT u.email FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_email
        FROM companies c
        WHERE c.id != 1
        ORDER BY c.id DESC
      `).all();

      const egotechCompany = db.prepare('SELECT * FROM companies WHERE id = 1').get() || null;

      const egotechUsers = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
               e.designation, e.employee_code, d.name as department_name
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE u.company_id = 1
        ORDER BY u.id ASC
      `).all();

      const egotechEmployees = db.prepare(`
        SELECT e.*, d.name as department_name, s.name as shift_name,
               ss.base_salary, u.id as user_id, u.role as account_role
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN shifts s ON e.shift_id = s.id
        LEFT JOIN salary_structures ss ON e.id = ss.employee_id
        LEFT JOIN users u ON e.id = u.employee_id
        WHERE e.company_id = 1
        ORDER BY e.id DESC
      `).all();

      const allCompaniesList = db.prepare('SELECT id, name, code, plan, status FROM companies ORDER BY id ASC').all();

      const allUsers = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.company_id,
               c.name as company_name,
               e.designation, e.employee_code, d.name as department_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        LEFT JOIN employees e ON u.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY u.id DESC
      `).all();

      const planStats = db.prepare(`
        SELECT plan, COUNT(*) as count
        FROM companies
        WHERE id != 1
        GROUP BY plan
      `).all();

      return res.json({
        role: 'owner',
        total_companies: clientCount,
        active_clients: activeClients,
        total_staff: totalStaff,
        total_users: totalUsers,
        client_companies: clientCompanies,
        egotech_company: egotechCompany,
        egotech_users: egotechUsers,
        egotech_employees: egotechEmployees,
        all_companies: allCompaniesList,
        all_users: allUsers,
        plan_breakdown: planStats,
      });
    }

    // -------------------------------------------------------------------------
    // 2. EMPLOYEE DASHBOARD
    // -------------------------------------------------------------------------
    if (!isHrOrAdmin) {
      const employeeId = req.currentUser.employee_id;

      if (!employeeId) {
        return res.json({
          role: 'employee',
          today_attendance: null,
          clocked_in: false,
          week_hours: 0,
          week_ot_hours: 0,
          leave_balances: [],
          latest_payslip: null,
          recent_attendance: [],
        });
      }

      // Today Attendance
      const todayAtt = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employeeId, today);

      // Week Hours
      const curr = new Date();
      const firstDayOfWeek = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1)).toISOString().split('T')[0];
      const weekHoursRow = db.prepare(`
        SELECT SUM(working_hours) as total_week_hours, SUM(overtime_hours) as total_ot_hours
        FROM attendance
        WHERE employee_id = ? AND date >= ? AND date <= ?
      `).get(employeeId, firstDayOfWeek, today);

      // Leave Balances
      const currentYear = new Date().getFullYear();
      const balances = db.prepare(`
        SELECT lb.total_days, lb.used_days, lt.name, lt.color
        FROM leave_balances lb
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id = ? AND lb.year = ?
      `).all(employeeId, currentYear);

      // Latest Payslip
      const latestPayslip = db.prepare(`
        SELECT * FROM payslips
        WHERE employee_id = ?
        ORDER BY year DESC, month DESC
        LIMIT 1
      `).get(employeeId);

      // Recent Attendance
      const recentAttendance = db.prepare(`
        SELECT * FROM attendance
        WHERE employee_id = ?
        ORDER BY date DESC
        LIMIT 7
      `).all(employeeId);

      return res.json({
        role: 'employee',
        today_attendance: todayAtt || null,
        clocked_in: Boolean(todayAtt && todayAtt.clock_in && !todayAtt.clock_out),
        week_hours: weekHoursRow?.total_week_hours || 0,
        week_ot_hours: weekHoursRow?.total_ot_hours || 0,
        leave_balances: balances,
        latest_payslip: latestPayslip || null,
        recent_attendance: recentAttendance,
      });
    }

    // -------------------------------------------------------------------------
    // 3. COMPANY HR & ADMINISTRATOR DASHBOARD
    // -------------------------------------------------------------------------
    const totalStaffRow = db.prepare("SELECT COUNT(*) as count FROM employees WHERE company_id = ? AND status = 'Active'").get(userCompanyId);
    const totalStaff = totalStaffRow?.count || 0;

    // Today Attendance stats for this company
    const todayStats = db.prepare(`
      SELECT
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) as leave_count,
        SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) as half_day_count
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.company_id = ? AND e.status = 'Active'
    `).get(today, userCompanyId);

    const pendingLeavesRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.company_id = ? AND lr.status = 'Pending'
    `).get(userCompanyId);

    // Latest payroll batch stats for this company
    const latestBatch = db.prepare(`
      SELECT * FROM payroll_batches
      WHERE company_id = ?
      ORDER BY year DESC, month DESC
      LIMIT 1
    `).get(userCompanyId);

    // Department breakdown
    const deptStats = db.prepare(`
      SELECT d.name, COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'Active'
      WHERE d.company_id = ?
      GROUP BY d.id
      ORDER BY count DESC
    `).all(userCompanyId);

    // Last 7 days attendance trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayStat = db.prepare(`
        SELECT
          SUM(CASE WHEN a.status = 'Present' OR a.status = 'Half Day' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) as leaves
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
        WHERE e.company_id = ? AND e.status = 'Active'
      `).get(dateStr, userCompanyId);

      trend.push({
        date: dateStr.slice(5),
        present: dayStat?.present || 0,
        late: dayStat?.late || 0,
        leaves: dayStat?.leaves || 0,
      });
    }

    // Recent 6 clock-in events
    const recentActivity = db.prepare(`
      SELECT a.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.company_id = ? AND a.date = ?
      ORDER BY a.clock_in DESC
      LIMIT 6
    `).all(userCompanyId, today);

    res.json({
      role: 'admin',
      total_staff: totalStaff,
      present_today: (todayStats?.present_count || 0) + (todayStats?.half_day_count || 0),
      late_today: todayStats?.late_count || 0,
      on_leave_today: todayStats?.leave_count || 0,
      absent_today: Math.max(0, totalStaff - ((todayStats?.present_count || 0) + (todayStats?.half_day_count || 0) + (todayStats?.leave_count || 0))),
      pending_leaves: pendingLeavesRow?.count || 0,
      latest_batch: latestBatch || null,
      department_stats: deptStats,
      attendance_trend: trend,
      recent_activity: recentActivity,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats: ' + err.message });
  }
}
