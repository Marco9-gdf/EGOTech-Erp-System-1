import { Router } from 'express';
import {
  getComplianceOverview,
  getLabourCodeAnalysis,
  rebalanceSalaryStructure,
  getDpdpConsents,
  anonymizeEmployeeData,
  getEmployeeDataDossier,
  getSecurityIncidents,
  createSecurityIncident,
  updateSecurityIncident,
  getAuditLogs,
  getPoshComplaints,
  filePoshComplaint,
  getPoshAnnualReport,
  getTaxDeclarations,
  saveTaxDeclaration,
  calculateTaxComparison,
  getSaasGstInvoices,
  generateSaasGstInvoice,
  signDpaContract,
} from '../controllers/complianceController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Compliance overview
router.get('/overview', getComplianceOverview);

// Labour Codes (Uniform Wage Definition 50% Rule)
router.get('/labour-codes', requireRoles('owner', 'admin', 'hr'), getLabourCodeAnalysis);
router.post('/labour-codes/rebalance/:employeeId', requireRoles('owner', 'admin'), rebalanceSalaryStructure);

// DPDP Act & Privacy Hub
router.get('/dpdp', requireRoles('owner', 'admin', 'hr'), getDpdpConsents);
router.post('/dpdp/anonymize/:employeeId', requireRoles('owner', 'admin'), anonymizeEmployeeData);
router.get('/dpdp/dossier/:employeeId', getEmployeeDataDossier);

// Security Incidents (CERT-In 6-Hour & DPDP 72-Hour Clocks)
router.get('/incidents', requireRoles('owner', 'admin', 'hr'), getSecurityIncidents);
router.post('/incidents', requireRoles('owner', 'admin', 'hr'), createSecurityIncident);
router.put('/incidents/:id', requireRoles('owner', 'admin'), updateSecurityIncident);

// 180-Day ICT System Audit Logs
router.get('/audit-logs', requireRoles('owner', 'admin'), getAuditLogs);

// POSH Act & ICC Complaints
router.get('/posh', getPoshComplaints);
router.post('/posh/complaints', filePoshComplaint);
router.get('/posh/annual-report', requireRoles('owner', 'admin', 'hr'), getPoshAnnualReport);

// Tax Declarations & Dual Regime Calculator (Section 192 TDS)
router.get('/tax-declarations', requireRoles('owner', 'admin', 'hr'), getTaxDeclarations);
router.post('/tax-declarations/:employeeId', requireRoles('owner', 'admin', 'hr'), saveTaxDeclaration);
router.post('/tax-calculator', calculateTaxComparison);

// B2B SaaS GST Invoices (SAC 998314) & DPA Contracts
router.get('/gst-invoices', requireRoles('owner', 'admin'), getSaasGstInvoices);
router.post('/gst-invoices/generate', requireRoles('owner'), generateSaasGstInvoice);
router.post('/contracts/sign-dpa', requireRoles('owner', 'admin'), signDpaContract);

export default router;
