import { Router } from 'express';
import {
  getAccounts,
  createAccount,
  resetPassword,
  updateAccountRole,
  updateAccountStatus,
  deleteAccount,
} from '../controllers/accountController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles('owner', 'admin'));

router.get('/', getAccounts);
router.post('/', createAccount);
router.put('/:id/password', resetPassword);
router.put('/:id/role', updateAccountRole);
router.put('/:id/status', updateAccountStatus);
router.delete('/:id', deleteAccount);

export default router;
