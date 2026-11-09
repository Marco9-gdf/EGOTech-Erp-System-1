import { Router } from 'express';
import {
  getEmployeeDocuments,
  uploadEmployeeDocument,
  verifyEmployeeDocument,
  deleteEmployeeDocument,
  previewFnFSettlement,
  saveFnFSettlement,
  getFnFSettlements,
  getEmployeeFnF,
} from '../controllers/lifecycleController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Document Locker
router.get('/documents/:employeeId', getEmployeeDocuments);
router.post('/documents', uploadEmployeeDocument);
router.put('/documents/:id/verify', requireRoles('owner', 'admin', 'hr'), verifyEmployeeDocument);
router.delete('/documents/:id', requireRoles('owner', 'admin', 'hr'), deleteEmployeeDocument);

// Full & Final (FnF) Settlements
router.post('/fnf/calculate', requireRoles('owner', 'admin', 'hr'), previewFnFSettlement);
router.post('/fnf', requireRoles('owner', 'admin', 'hr'), saveFnFSettlement);
router.get('/fnf', requireRoles('owner', 'admin', 'hr'), getFnFSettlements);
router.get('/fnf/:employeeId', getEmployeeFnF);

export default router;
