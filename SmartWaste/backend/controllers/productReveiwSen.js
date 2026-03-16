import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export const analyzeReview = (req, res) => {
  const { review } = req.body;

  if (!review) {
    return res.status(400).json({ error: 'Review text is required.' });
  }

  const result = sentiment.analyze(review);
  let sentimentLabel = 'Neutral';

  if (result.score > 0) {
    sentimentLabel = 'Positive';
  } else if (result.score < 0) {
    sentimentLabel = 'Negative';
  }

  res.json({
    review,
    sentiment: sentimentLabel,
    score: result.score,
    words: result.words,
    positive: result.positive,
    negative: result.negative,
  });
};
