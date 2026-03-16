// controllers/reviewController.js
import Review from '../Models/Review.js';
import User from '../Models/User.js';
import axios from 'axios';

// Add a new review
export const addReview = async (req, res) => {
  try {
    const { clerkId, reviewText, rating } = req.body;

    if (!clerkId || !reviewText || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ clerkId });
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Anonymous User';

    const newReview = new Review({
      clerkId,
      userName,
      reviewText,
      rating,
    });

    try {
      const sentiment = await analyzeSentiment(reviewText);
      if (sentiment) {
        newReview.sentiment = sentiment.score;
        newReview.sentimentLabel = sentiment.label;
      }
    } catch (sentimentError) {
      console.error('Error analyzing sentiment:', sentimentError);
    }

    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get sentiment analysis summary
export const getSentimentAnalysis = async (req, res) => {
  try {
    const reviews = await Review.find({ sentimentLabel: { $ne: null } });

    if (reviews.length === 0) {
      return res.status(200).json({
        positivePercentage: 0,
        neutralPercentage: 0,
        negativePercentage: 0,
        topKeywords: [],
      });
    }

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let allText = '';

    reviews.forEach(review => {
      if (review.sentimentLabel === 'positive' || review.sentiment > 0.33) {
        positive++;
      } else if (review.sentimentLabel === 'negative' || review.sentiment < -0.33) {
        negative++;
      } else {
        neutral++;
      }

      allText += ' ' + review.reviewText;
    });

    const total = reviews.length;

    const positivePercentage = Math.round((positive / total) * 100);
    const neutralPercentage = Math.round((neutral / total) * 100);
    const negativePercentage = Math.round((negative / total) * 100);

    const topKeywords = extractTopKeywords(allText);

    res.status(200).json({
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      averageRating: calculateAverageRating(reviews),
      topKeywords,
    });
  } catch (error) {
    console.error('Error generating sentiment analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to analyze sentiment using Groq AI
async function analyzeSentiment(text) {
  try {
    const VITE_GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
    if (!VITE_GROQ_API_KEY) {
      console.error('VITE_VITE_GROQ_API_KEY');
      return null;
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with a JSON object only containing a score between -1 (very negative) and 1 (very positive), and a label that is one of: "positive", "negative", or "neutral".'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.2,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const responseContent = response.data.choices[0].message.content;

    try {
      const parsedResponse = JSON.parse(responseContent);
      return {
        score: parsedResponse.score,
        label: parsedResponse.label
      };
    } catch (parseError) {
      console.error('Error parsing sentiment response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return null;
  }
}

// Helper function to calculate average rating
function calculateAverageRating(reviews) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return (sum / reviews.length).toFixed(1);
}

// Helper function to extract top keywords
function extractTopKeywords(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'from', 'up', 'down', 'i', 'me', 'my', 'myself', 'we', 'our',
    'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
    'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'this',
    'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'would', 'should', 'could', 'ought', 'im', 'youre', 'hes', 'shes',
    'its', 'were', 'theyre', 'ive', 'youve', 'weve', 'theyve', 'id',
    'youd', 'hed', 'shed', 'wed', 'theyd', 'ill', 'youll', 'hell',
    'shell', 'well', 'theyll', 'isnt', 'arent', 'wasnt', 'werent',
    'hasnt', 'havent', 'hadnt', 'doesnt', 'dont', 'didnt', 'wont',
    'wouldnt', 'shouldnt', 'couldnt', 'cant', 'cannot', 'couldnt'
  ]);

  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanText.split(' ');
  const wordFrequency = {};

  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });

  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 10);
}
