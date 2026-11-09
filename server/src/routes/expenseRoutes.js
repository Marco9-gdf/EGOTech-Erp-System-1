import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  reviewExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// General expense endpoints
router.get('/', getExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

// Review endpoint for HR, Admin, and Owner
router.put('/:id/review', requireRoles('owner', 'admin', 'hr'), reviewExpense);

export default router;
