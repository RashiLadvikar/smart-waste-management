import express from 'express';
import { addReview, getAllReviews, getSentimentAnalysis } from '../controllers/reviewController.js';

const router = express.Router();

// Public routes
router.get('/', getAllReviews);
router.get('/sentiment', getSentimentAnalysis);

// Protected routes
router.post('/add',  addReview);

export default router;
