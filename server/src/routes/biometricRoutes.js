import { Router } from 'express';
import express from 'express';
import {
  handleAdmsHandshake,
  handleAdmsData,
  syncCloudBiometric,
  getDevices,
  registerDevice,
  deleteDevice,
  simulatePunch,
} from '../controllers/biometricController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

// ZKTeco / eSSL ADMS protocol endpoints (Hardware devices ping directly without JWT)
router.get('/cdata', handleAdmsHandshake);
router.post('/cdata', express.text({ type: '*/*' }), handleAdmsData);
router.post('/sync', syncCloudBiometric);

// Authenticated device management routes
router.use(authenticateToken);

router.get('/devices', requireRoles('owner', 'admin', 'hr'), getDevices);
router.post('/devices', requireRoles('owner', 'admin'), registerDevice);
router.delete('/devices/:id', requireRoles('owner', 'admin'), deleteDevice);
router.post('/devices/:id/simulate-punch', requireRoles('owner', 'admin', 'hr'), simulatePunch);

export default router;
