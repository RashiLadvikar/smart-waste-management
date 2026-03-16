import express from 'express';
import { submitReview } from '../controllers/reveiwControllerr.js';

const router = express.Router();

router.post('/submitReview', submitReview);

export default router;
