import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/stats', getDashboardStats);

export default router;
