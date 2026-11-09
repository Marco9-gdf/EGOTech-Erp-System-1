import db from '../config/database.js';
import { dispatchWebhook } from '../services/webhookService.js';

/**
 * Biometric Hardware Push SDK & ADMS Controller
 * Supports ZKTeco, eSSL, Realtime, and cloud biometric time attendance terminals.
 */

// 1. ZKTeco / eSSL ADMS Handshake (GET /api/biometric/cdata)
export function handleAdmsHandshake(req, res) {
  const sn = req.query.SN || req.query.sn || 'UNKNOWN_DEVICE';
  console.log(`📡 Biometric Device Handshake ping from SN: ${sn}`);

  // Update device last_sync_at if recognized
  try {
    db.prepare(`
      UPDATE biometric_devices
      SET last_sync_at = CURRENT_TIMESTAMP, status = 'Online'
      WHERE serial_number = ?
    `).run(sn);
  } catch (e) {
    // non-fatal
  }

  // Standard ZKTeco ADMS Response Protocol
  res.setHeader('Content-Type', 'text/plain');
  res.send(`GET OPTION FROM: ${sn}\nStamp=9999\nOpStamp=9999\nErrorDelay=60\nDelay=30\nResStamp=9999\nPushProtVer=2.4.1\n`);
}

// 2. ZKTeco / eSSL Push Data Ingestion (POST /api/biometric/cdata)
export function handleAdmsData(req, res) {
  try {
    const sn = req.query.SN || req.query.sn || 'ZKT-DEFAULT';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    console.log(`📥 Biometric Push Data received from SN: ${sn}`);

    // Parse punches from line-separated records
    // Typically: USERID\tCHECKTIME\tCHECKTYPE (e.g. 101\t2026-11-07 09:02:15\t0)
    let punchCount = 0;
    const lines = (rawBody || '').split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/[\t, ]+/);
      if (parts.length >= 2) {
        const userId = parts[0];
        const timestamp = parts[1] + (parts[2] && parts[2].includes(':') ? ' ' + parts[2] : '');
        ingestSinglePunch(userId, timestamp, sn);
        punchCount++;
      }
    }

    // Update terminal status
    db.prepare(`
      UPDATE biometric_devices
      SET last_sync_at = CURRENT_TIMESTAMP, status = 'Online'
      WHERE serial_number = ?
    `).run(sn);

    res.setHeader('Content-Type', 'text/plain');
    res.send(`OK: ${punchCount}\n`);
  } catch (err) {
    console.error('handleAdmsData error:', err);
    res.status(500).send('ERROR\n');
  }
}

// 3. Modern Cloud Biometric JSON Sync (POST /api/biometric/sync)
export function syncCloudBiometric(req, res) {
  try {
    const { device_sn, punches } = req.body;
    const companyId = req.currentUser?.company_id || 1;

    if (!Array.isArray(punches) || punches.length === 0) {
      return res.status(400).json({ error: 'No punch records provided for sync.' });
    }

    let processed = 0;
    for (const p of punches) {
      const result = ingestSinglePunch(p.biometric_id || p.employee_code || p.employee_id, p.timestamp || new Date().toISOString(), device_sn || 'CLOUD-TERMINAL', companyId);
      if (result) processed++;
    }

    // Update terminal if matching
    if (device_sn) {
      db.prepare(`
        UPDATE biometric_devices
        SET last_sync_at = CURRENT_TIMESTAMP, status = 'Online'
        WHERE serial_number = ?
      `).run(device_sn);
    }

    res.json({
      message: `Biometric attendance sync complete. Processed ${processed} punches.`,
      processed_count: processed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('syncCloudBiometric error:', err);
    res.status(500).json({ error: 'Failed to process cloud biometric sync: ' + err.message });
  }
}

// Helper: Process single punch into attendance record
function ingestSinglePunch(biometricIdentifier, punchTimestamp, deviceSn, explicitCompanyId = null) {
  try {
    if (!biometricIdentifier || !punchTimestamp) return false;

    // Find employee by biometric_id, employee_code, or id
    const emp = db.prepare(`
      SELECT id, company_id, first_name, last_name, shift_id
      FROM employees
      WHERE biometric_id = ? OR employee_code = ? OR id = ?
      LIMIT 1
    `).get(String(biometricIdentifier), String(biometricIdentifier), String(biometricIdentifier));

    if (!emp) return false;

    const companyId = explicitCompanyId || emp.company_id || 1;
    const punchDate = new Date(punchTimestamp);
    if (isNaN(punchDate.getTime())) return false;

    const dateStr = punchDate.toISOString().split('T')[0];
    const timeStr = punchDate.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

    const existing = db.prepare(`
      SELECT * FROM attendance
      WHERE employee_id = ? AND date = ?
    `).get(emp.id, dateStr);

    if (!existing) {
      // First punch of the day: Check-in
      db.prepare(`
        INSERT INTO attendance (
          company_id, employee_id, date, clock_in, status, notes, is_geofenced
        ) VALUES (?, ?, ?, ?, 'Present', ?, 1)
      `).run(
        companyId,
        emp.id,
        dateStr,
        timeStr,
        `Biometric Hardware Sync (Device: ${deviceSn})`
      );
    } else {
      // Subsequent punch of the day: Check-out update
      const clockIn = existing.clock_in || timeStr;
      let totalHours = existing.total_hours || 0;

      if (clockIn) {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = timeStr.split(':').map(Number);
        const diffMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
        totalHours = Math.round((diffMinutes / 60) * 10) / 10;
      }

      db.prepare(`
        UPDATE attendance SET
          clock_out = ?,
          total_hours = ?,
          notes = notes || ' | Punch: ' || ?
        WHERE id = ?
      `).run(timeStr, totalHours, timeStr, existing.id);
    }

    return true;
  } catch (err) {
    console.error('ingestSinglePunch error:', err);
    return false;
  }
}

// 4. Device Management Endpoints
export function getDevices(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const devices = db.prepare(`
      SELECT d.*,
             (SELECT COUNT(*) FROM attendance a WHERE a.notes LIKE '%' || d.serial_number || '%' AND a.date = CURRENT_DATE) as today_syncs
      FROM biometric_devices d
      WHERE d.company_id = ?
      ORDER BY d.id DESC
    `).all(companyId);

    res.json({ devices });
  } catch (err) {
    console.error('getDevices error:', err);
    res.status(500).json({ error: 'Failed to retrieve biometric devices: ' + err.message });
  }
}

export function registerDevice(req, res) {
  try {
    const companyId = req.currentUser.company_id || 1;
    const { device_name, device_model, serial_number, ip_address, port, location } = req.body;

    if (!device_name || !serial_number) {
      return res.status(400).json({ error: 'Device name and Serial Number are required.' });
    }

    const cleanSn = serial_number.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM biometric_devices WHERE serial_number = ?').get(cleanSn);
    if (existing) {
      return res.status(400).json({ error: `A device with serial number "${cleanSn}" is already registered.` });
    }

    const insert = db.prepare(`
      INSERT INTO biometric_devices (
        company_id, device_name, device_model, serial_number, ip_address, port, location, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Online')
    `).run(
      companyId,
      device_name,
      device_model || 'ZKTeco K40 / SilkBio-101',
      cleanSn,
      ip_address || '192.168.1.100',
      port || 4370,
      location || 'Office Entrance'
    );

    const device = db.prepare('SELECT * FROM biometric_devices WHERE id = ?').get(insert.lastInsertRowid);

    res.status(201).json({
      message: 'Biometric terminal registered successfully.',
      device,
    });
  } catch (err) {
    console.error('registerDevice error:', err);
    res.status(500).json({ error: 'Failed to register biometric device: ' + err.message });
  }
}

export function deleteDevice(req, res) {
  try {
    const { id } = req.params;
    const companyId = req.currentUser.company_id || 1;

    db.prepare('DELETE FROM biometric_devices WHERE id = ? AND company_id = ?').run(id, companyId);
    res.json({ message: 'Biometric terminal deregistered successfully.' });
  } catch (err) {
    console.error('deleteDevice error:', err);
    res.status(500).json({ error: 'Failed to delete device: ' + err.message });
  }
}

// 5. Test/Simulate Live Hardware Punch (Great for demoing push synchronization)
export function simulatePunch(req, res) {
  try {
    const { id } = req.params; // device id
    const { employee_id, punch_type } = req.body; // punch_type: 'clock_in' | 'clock_out'
    const companyId = req.currentUser.company_id || 1;

    const device = db.prepare('SELECT * FROM biometric_devices WHERE id = ?').get(id);
    if (!device) {
      return res.status(404).json({ error: 'Biometric device not found.' });
    }

    const emp = db.prepare('SELECT * FROM employees WHERE id = ? AND company_id = ?').get(employee_id, companyId);
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

    const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(emp.id, dateStr);

    if (!existing || punch_type === 'clock_in') {
      db.prepare(`
        INSERT INTO attendance (
          company_id, employee_id, date, clock_in, status, notes, is_geofenced
        ) VALUES (?, ?, ?, ?, 'Present', ?, 1)
        ON CONFLICT(employee_id, date) DO UPDATE SET
          clock_in = excluded.clock_in,
          status = 'Present',
          notes = excluded.notes
      `).run(companyId, emp.id, dateStr, timeStr, `Biometric Hardware Sync (${device.device_name} - ${device.serial_number})`);
    } else {
      const clockIn = existing.clock_in || '09:00';
      const [inH, inM] = clockIn.split(':').map(Number);
      const [outH, outM] = timeStr.split(':').map(Number);
      const diffMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
      const totalHours = Math.round((diffMinutes / 60) * 10) / 10;

      db.prepare(`
        UPDATE attendance SET
          clock_out = ?,
          total_hours = ?,
          status = 'Present',
          notes = notes || ' | ' || ?
        WHERE id = ?
      `).run(timeStr, totalHours, `Out: ${timeStr} (${device.serial_number})`, existing.id);
    }

    // Update device last_sync_at
    db.prepare('UPDATE biometric_devices SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?').run(device.id);

    // Dispatch webhook alert
    dispatchWebhook(companyId, 'biometric.sync_complete', {
      message: `Punch captured at ${device.device_name} (${device.location}) for ${emp.first_name} ${emp.last_name} at ${timeStr}.`,
    });

    res.json({
      message: `Hardware punch recorded from ${device.device_name} for ${emp.first_name} ${emp.last_name} at ${timeStr}. Attendance updated.`,
      timestamp: now.toISOString(),
      employee: `${emp.first_name} ${emp.last_name}`,
      punch_time: timeStr,
    });
  } catch (err) {
    console.error('simulatePunch error:', err);
    res.status(500).json({ error: 'Failed to simulate punch: ' + err.message });
  }
}
