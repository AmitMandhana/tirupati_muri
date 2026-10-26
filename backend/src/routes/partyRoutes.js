import { Router } from 'express';

import { createParty, listParties } from '../controllers/partyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listParties);
router.post('/', createParty);

export default router;
