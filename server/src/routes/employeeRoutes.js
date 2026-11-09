import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateSalaryStructure,
  deleteEmployee,
  getDepartments,
  getShifts,
} from '../controllers/employeeController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/departments', getDepartments);
router.get('/shifts', getShifts);

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', requireRoles('admin', 'hr'), createEmployee);
router.put('/:id', requireRoles('admin', 'hr'), updateEmployee);
router.put('/:id/salary', requireRoles('admin', 'hr'), updateSalaryStructure);
router.delete('/:id', requireRoles('admin', 'hr'), deleteEmployee);

export default router;
