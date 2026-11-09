import { Router } from 'express';
import { askAiAssistant } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/ask', askAiAssistant);

export default router;
