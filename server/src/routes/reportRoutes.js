import { Router } from 'express';
import { getAttendanceReport, getPayrollReport } from '../controllers/reportController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles('admin', 'hr'));

router.get('/attendance', getAttendanceReport);
router.get('/payroll', getPayrollReport);

export default router;
