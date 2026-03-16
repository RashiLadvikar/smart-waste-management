import Sentiment from 'sentiment';
// import {produceReview} from '../services/fluvioProducer.js';

const sentiment = new Sentiment();

export const submitReview = async (req, res) => {
  try {
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ error: 'Review is required' });
    }

    // Analyze sentiment
    const result = sentiment.analyze(review);

    // Send to Fluvio
    await produceReview(review);

    return res.status(200).json({
      review,
      sentimentScore: result.score,
      sentiment: result.score > 0 ? 'Positive' : result.score < 0 ? 'Negative' : 'Neutral',
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
