import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyAttendance,
  getMasterAttendance,
  markAttendanceManual,
  bulkMarkAttendance,
} from '../controllers/attendanceController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Employee actions
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/my', getMyAttendance);

// HR / Admin actions
router.get('/master', requireRoles('admin', 'hr'), getMasterAttendance);
router.post('/manual', requireRoles('admin', 'hr'), markAttendanceManual);
router.post('/bulk', requireRoles('admin', 'hr'), bulkMarkAttendance);

export default router;
