import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getPlatformStats,
  registerPublicCompany,
  listBackupsHandler,
  createBackupHandler,
  downloadBackupHandler,
  restoreBackupHandler,
  testWebhookHandler,
  getWebhookLogsHandler,
} from '../controllers/companyController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// Public self-service onboarding for landing page
router.post('/register', registerPublicCompany);

router.use(authenticateToken);

// Enterprise Database Backups (CERT-In Disaster Recovery)
router.get('/backups/list', requireRoles('owner', 'admin'), listBackupsHandler);
router.post('/backups', requireRoles('owner', 'admin'), createBackupHandler);
router.get('/backups/:fileName/download', requireRoles('owner', 'admin'), downloadBackupHandler);
router.post('/backups/:fileName/restore', requireRoles('owner', 'admin'), restoreBackupHandler);

// Multi-Channel Webhooks & Notifications
router.post('/test-webhook', requireRoles('owner', 'admin'), testWebhookHandler);
router.get('/webhooks/logs', requireRoles('owner', 'admin'), getWebhookLogsHandler);

// Platform stats for Owner
router.get('/stats', requireRoles('owner'), getPlatformStats);

// Company management
router.get('/', requireRoles('owner'), getCompanies);
router.get('/:id', requireRoles('owner', 'admin'), getCompanyById);
router.post('/', requireRoles('owner'), createCompany);
router.put('/:id', requireRoles('owner', 'admin'), updateCompany);
router.delete('/:id', requireRoles('owner'), deleteCompany);

export default router;
