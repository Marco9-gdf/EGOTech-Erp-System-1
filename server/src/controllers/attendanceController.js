import db from '../config/database.js';

function getLocalDateString(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function getLocalTimeString(d = new Date()) {
  return d.toTimeString().split(' ')[0]; // HH:MM:SS
}

function calculateHoursDifference(startTimeStr, endTimeStr) {
  const [sH, sM, sS = 0] = startTimeStr.split(':').map(Number);
  const [eH, eM, eS = 0] = endTimeStr.split(':').map(Number);
  const startSec = sH * 3600 + sM * 60 + sS;
  const endSec = eH * 3600 + eM * 60 + eS;
  let diffSec = endSec - startSec;
  if (diffSec < 0) diffSec += 24 * 3600; // crosses midnight
  return Math.round((diffSec / 3600) * 100) / 100;
}

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function clockIn(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'Current user has no associated employee profile.' });
    }

    const todayStr = getLocalDateString();
    const timeStr = getLocalTimeString();
    const { latitude, longitude, notes = 'Web Punch-In' } = req.body || {};

    // Check existing record
    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employeeId, todayStr);

    if (existing && existing.clock_in) {
      return res.status(400).json({ error: `Already clocked in at ${existing.clock_in}` });
    }

    // Geofencing verification
    const companyId = req.currentUser.company_id || 1;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) || {};

    let distanceMeters = null;
    let isGeofenced = 1;

    if (company.office_latitude != null && company.office_longitude != null) {
      if (latitude != null && longitude != null) {
        distanceMeters = calculateHaversineDistance(
          Number(latitude),
          Number(longitude),
          Number(company.office_latitude),
          Number(company.office_longitude)
        );
        const radius = Number(company.geofence_radius_meters) || 200;
        isGeofenced = distanceMeters <= radius ? 1 : 0;
      } else {
        isGeofenced = 0;
      }

      // If geofencing is strictly enforced by company
      if (company.geofencing_enabled && !isGeofenced) {
        const radius = Number(company.geofence_radius_meters) || 200;
        const officeName = company.office_name || 'Designated Office Location';
        if (latitude == null || longitude == null) {
          return res.status(403).json({
            error: `Office Geofencing is enabled for ${officeName}. Please allow location/GPS permissions in your browser to clock in.`,
            geofencing_required: true,
          });
        } else {
          return res.status(403).json({
            error: `Location verification failed: You are ${distanceMeters}m away from ${officeName}. Maximum permitted radius is ${radius}m.`,
            distance_meters: distanceMeters,
            allowed_radius: radius,
            office_name: officeName,
            geofencing_failed: true,
          });
        }
      }
    }

    // Get shift info to evaluate lateness
    const emp = db.prepare(`
      SELECT e.shift_id, s.start_time, s.grace_period_minutes
      FROM employees e
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(employeeId);

    let isLate = 0;
    if (emp && emp.start_time) {
      const [shiftH, shiftM] = emp.start_time.split(':').map(Number);
      const shiftMinute = shiftH * 60 + shiftM + (emp.grace_period_minutes || 15);

      const [curH, curM] = timeStr.split(':').map(Number);
      const currentMinute = curH * 60 + curM;

      if (currentMinute > shiftMinute) {
        isLate = 1;
      }
    }

    if (existing) {
      db.prepare(`
        UPDATE attendance SET
          clock_in = ?,
          is_late = ?,
          status = 'Present',
          latitude = ?,
          longitude = ?,
          distance_meters = ?,
          is_geofenced = ?,
          notes = ?
        WHERE id = ?
      `).run(timeStr, isLate, latitude ?? null, longitude ?? null, distanceMeters ?? null, isGeofenced, notes, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (employee_id, date, clock_in, status, is_late, latitude, longitude, distance_meters, is_geofenced, notes)
        VALUES (?, ?, ?, 'Present', ?, ?, ?, ?, ?, ?)
      `).run(employeeId, todayStr, timeStr, isLate, latitude ?? null, longitude ?? null, distanceMeters ?? null, isGeofenced, notes);
    }

    res.json({
      message: 'Clocked in successfully!',
      clock_in: timeStr,
      date: todayStr,
      is_late: Boolean(isLate),
      distance_meters: distanceMeters,
      is_geofenced: Boolean(isGeofenced),
    });
  } catch (err) {
    console.error('clockIn error:', err);
    res.status(500).json({ error: 'Failed to clock in: ' + err.message });
  }
}

export function clockOut(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }

    const todayStr = getLocalDateString();
    const timeStr = getLocalTimeString();

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employeeId, todayStr);

    if (!existing || !existing.clock_in) {
      return res.status(400).json({ error: 'You have not clocked in today yet.' });
    }

    if (existing.clock_out) {
      return res.status(400).json({ error: `Already clocked out today at ${existing.clock_out}` });
    }

    // Calculate working hours
    const workedHours = calculateHoursDifference(existing.clock_in, timeStr);

    // Get shift standards
    const emp = db.prepare(`
      SELECT s.full_day_hours, s.half_day_hours
      FROM employees e
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = ?
    `).get(employeeId);

    const fullDayHours = emp?.full_day_hours || 8.0;
    const halfDayHours = emp?.half_day_hours || 4.0;

    let overtimeHours = 0;
    let status = 'Present';

    if (workedHours >= fullDayHours) {
      status = 'Present';
      overtimeHours = Math.max(0, Math.round((workedHours - fullDayHours) * 100) / 100);
    } else if (workedHours >= halfDayHours) {
      status = 'Half Day';
    } else {
      status = 'Present'; // or short day
    }

    db.prepare(`
      UPDATE attendance SET
        clock_out = ?,
        working_hours = ?,
        overtime_hours = ?,
        status = ?
      WHERE id = ?
    `).run(timeStr, workedHours, overtimeHours, status, existing.id);

    res.json({
      message: 'Clocked out successfully!',
      clock_out: timeStr,
      working_hours: workedHours,
      overtime_hours: overtimeHours,
      status,
    });
  } catch (err) {
    console.error('clockOut error:', err);
    res.status(500).json({ error: 'Failed to clock out.' });
  }
}

export function getTodayStatus(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.json({ clockedIn: false, record: null });
    }

    const todayStr = getLocalDateString();
    const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employeeId, todayStr);

    res.json({
      clockedIn: Boolean(record && record.clock_in && !record.clock_out),
      clockedOut: Boolean(record && record.clock_out),
      record: record || null,
      serverTime: getLocalTimeString(),
      serverDate: todayStr,
    });
  } catch (err) {
    console.error('getTodayStatus error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance status.' });
  }
}

export function getMyAttendance(req, res) {
  try {
    const employeeId = req.currentUser.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }

    const { month, year } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const records = db.prepare(`
      SELECT * FROM attendance
      WHERE employee_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `).all(employeeId, startDate, endDate);

    // Summary calculations
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;

    records.forEach((r) => {
      if (r.status === 'Present') presentDays++;
      if (r.status === 'Half Day') halfDays++;
      if (r.is_late) lateDays++;
      totalWorkedHours += Number(r.working_hours) || 0;
      totalOvertimeHours += Number(r.overtime_hours) || 0;
    });

    res.json({
      month: currentMonth,
      year: currentYear,
      summary: {
        presentDays,
        halfDays,
        lateDays,
        totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      },
      records,
    });
  } catch (err) {
    console.error('getMyAttendance error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
}

export function getMasterAttendance(req, res) {
  try {
    const { date, department_id, status } = req.query;
    const targetDate = date || getLocalDateString();

    let query = `
      SELECT e.id as employee_id, e.employee_code, e.first_name, e.last_name,
             e.designation, d.name as department_name, s.name as shift_name,
             s.start_time as shift_start, s.end_time as shift_end,
             a.id as attendance_id, a.clock_in, a.clock_out, a.working_hours,
             a.overtime_hours, a.is_late,
             COALESCE(a.status, 'Absent') as attendance_status,
             a.notes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.status = 'Active'
    `;
    const params = [targetDate];

    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      if (status === 'Absent') {
        query += " AND (a.status IS NULL OR a.status = 'Absent')";
      } else {
        query += ' AND a.status = ?';
        params.push(status);
      }
    }

    query += ' ORDER BY e.first_name ASC';

    const records = db.prepare(query).all(...params);

    // Calculate today stats
    const statsStmt = db.prepare(`
      SELECT
        COUNT(e.id) as total_active,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) as half_day_count,
        SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) as on_leave_count,
        SUM(CASE WHEN a.status IS NULL OR a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.status = 'Active'
    `);
    const stats = statsStmt.get(targetDate);

    res.json({
      date: targetDate,
      stats,
      records,
    });
  } catch (err) {
    console.error('getMasterAttendance error:', err);
    res.status(500).json({ error: 'Failed to fetch master attendance.' });
  }
}

export function markAttendanceManual(req, res) {
  try {
    const { employee_id, date, clock_in, clock_out, status, notes, is_late } = req.body;
    if (!employee_id || !date || !status) {
      return res.status(400).json({ error: 'Employee, date, and status are required.' });
    }

    let working_hours = 0;
    let overtime_hours = 0;

    if (clock_in && clock_out) {
      working_hours = calculateHoursDifference(clock_in, clock_out);
      if (working_hours > 8) {
        overtime_hours = Math.round((working_hours - 8) * 100) / 100;
      }
    }

    const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?').get(employee_id, date);

    if (existing) {
      db.prepare(`
        UPDATE attendance SET
          clock_in = ?,
          clock_out = ?,
          working_hours = ?,
          overtime_hours = ?,
          status = ?,
          is_late = ?,
          notes = ?
        WHERE id = ?
      `).run(clock_in || null, clock_out || null, working_hours, overtime_hours, status, is_late ? 1 : 0, notes || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (
          employee_id, date, clock_in, clock_out, working_hours,
          overtime_hours, status, is_late, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(employee_id, date, clock_in || null, clock_out || null, working_hours, overtime_hours, status, is_late ? 1 : 0, notes || null);
    }

    res.json({ message: 'Attendance updated successfully.' });
  } catch (err) {
    console.error('markAttendanceManual error:', err);
    res.status(500).json({ error: 'Failed to update attendance.' });
  }
}

export function bulkMarkAttendance(req, res) {
  try {
    const { date, status = 'Present', employee_ids } = req.body;
    const targetDate = date || getLocalDateString();

    const employees = employee_ids && employee_ids.length > 0
      ? employee_ids.map(id => ({ id }))
      : db.prepare("SELECT id FROM employees WHERE status = 'Active'").all();

    const upsertStmt = db.prepare(`
      INSERT INTO attendance (employee_id, date, status, clock_in, clock_out, working_hours)
      VALUES (?, ?, ?, '09:00:00', '18:00:00', 8.0)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        status = excluded.status,
        clock_in = COALESCE(attendance.clock_in, excluded.clock_in),
        clock_out = COALESCE(attendance.clock_out, excluded.clock_out),
        working_hours = 8.0
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      employees.forEach((emp) => {
        upsertStmt.run(emp.id, targetDate, status);
      });
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    res.json({ message: `Successfully updated attendance for ${employees.length} employees.` });
  } catch (err) {
    console.error('bulkMarkAttendance error:', err);
    res.status(500).json({ error: 'Failed to bulk mark attendance.' });
  }
}
