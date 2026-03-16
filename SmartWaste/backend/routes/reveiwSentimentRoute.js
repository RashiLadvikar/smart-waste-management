import express from 'express';
import { analyzeReview } from '../controllers/productReveiwSen.js';

const router = express.Router();

router.post('/analyze-review', analyzeReview);

export default router;
