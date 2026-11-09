import { Router } from 'express';
import {
  getLeaveTypes,
  getMyBalances,
  applyLeave,
  getLeaveRequests,
  reviewLeave,
} from '../controllers/leaveController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/types', getLeaveTypes);
router.get('/balances', getMyBalances);
router.post('/apply', applyLeave);
router.get('/requests', getLeaveRequests);
router.put('/requests/:id/review', requireRoles('admin', 'hr'), reviewLeave);

export default router;
