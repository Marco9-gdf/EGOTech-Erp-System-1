import { Router } from 'express';
import {
  getPayrollBatches,
  previewPayrollBatch,
  generatePayrollBatch,
  finalizePayrollBatch,
  getPayslips,
  getPayslipById,
  updatePayslip,
  downloadPayslipPDF,
  emailBatchPayslips,
  emailSinglePayslip,
  submitBatchForReview,
  approveBatch,
  rejectBatch,
  exportEcrFile,
  exportBankBatchFile,
  exportFormTWageRegister,
} from '../controllers/payrollController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// General & Payslip endpoints
router.get('/payslips', getPayslips);
router.get('/payslips/:id', getPayslipById);
router.get('/payslips/:id/pdf', downloadPayslipPDF);
router.post('/payslips/:id/email', emailSinglePayslip);

// Admin & HR management endpoints
router.get('/batches', requireRoles('owner', 'admin', 'hr'), getPayrollBatches);
router.get('/preview', requireRoles('owner', 'admin', 'hr'), previewPayrollBatch);
router.post('/generate', requireRoles('owner', 'admin', 'hr'), generatePayrollBatch);
router.put('/batches/:id/finalize', requireRoles('owner', 'admin', 'hr'), finalizePayrollBatch);
router.post('/batches/:id/email-all', requireRoles('owner', 'admin', 'hr'), emailBatchPayslips);
router.put('/payslips/:id', requireRoles('owner', 'admin', 'hr'), updatePayslip);

// 🛡️ Maker-Checker Workflow & Statutory Exports
router.post('/batches/:id/submit-review', requireRoles('owner', 'admin', 'hr'), submitBatchForReview);
router.post('/batches/:id/approve', requireRoles('owner', 'admin'), approveBatch);
router.post('/batches/:id/reject', requireRoles('owner', 'admin'), rejectBatch);
router.get('/batches/:id/export-ecr', requireRoles('owner', 'admin', 'hr'), exportEcrFile);
router.get('/batches/:id/export-bank', requireRoles('owner', 'admin', 'hr'), exportBankBatchFile);
router.get('/batches/:id/export-form-t', requireRoles('owner', 'admin', 'hr'), exportFormTWageRegister);

export default router;
