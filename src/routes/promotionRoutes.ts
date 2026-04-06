import { Router } from 'express';
import * as promotionController from '../controllers/promotionController.js';

const router: Router = Router();

// Public: get all active published promotions for banner display
router.get('/active', promotionController.getActivePromotions);

export default router;
