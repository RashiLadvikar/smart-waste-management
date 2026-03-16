// services/fluvioSentiment.js
const { Fluvio } = require('@fluvio/client');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

let fluvio;

async function initializeFluvio() {
  if (!fluvio) {
    fluvio = new Fluvio();
    await fluvio.connect();
  }
  return fluvio;
}

async function analyzeAndPublishReview(reviewText) {
  await initializeFluvio();
  const topic = await fluvio.topicProducer('reviews');

  const sentimentResult = sentiment.analyze(reviewText);
  const data = {
    text: reviewText,
    score: sentimentResult.score,
    comparative: sentimentResult.comparative,
  };

  await topic.send('user-review', JSON.stringify(data));

  return data; // return to controller
}

module.exports = {
  analyzeAndPublishReview,
};
