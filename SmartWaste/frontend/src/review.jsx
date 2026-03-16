import React, { useState, useEffect } from 'react';
import axios from "axios";
import { toast } from "react-toastify";
import { useUser } from "@clerk/clerk-react";

const ReviewDashboard = () => {
  const [reviews, setReviews] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);

        // Fetch all reviews
        const reviewsResponse = await axios.get(
          "https://smartwatemobile-1.onrender.com/api/reviews"
        );

        setReviews(reviewsResponse.data);

        // Process sentiment analysis on frontend
        await processReviewSentiment(reviewsResponse.data);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load reviews and process sentiment analysis");
        setLoading(false);
        toast.error("Failed to load review data");
      }
    };

    fetchReviews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoaded || !isSignedIn) {
      toast.error("Please sign in to submit a review");
      return;
    }

    if (review.trim() === '') {
      toast.error("Please enter a review");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await axios.post(
        "https://smartwatemobile-1.onrender.com/api/reviews/add",
        {
          clerkId: user.id,
          reviewText: review,
          rating: rating,
        }
      );

      toast.success("Review submitted successfully!");

      // Analyze the new review immediately
      const newReview = response.data;
      const sentiment = await analyzeSentiment(newReview.reviewText);

      if (sentiment) {
        newReview.sentiment = sentiment.score;
        newReview.sentimentLabel = sentiment.label;
      }

      // Add the new review to the state and recalculate sentiment data
      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      await processReviewSentiment(updatedReviews);

      // Reset form
      setReview('');
      setRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processReviewSentiment = async (reviewsData) => {
    try {
      // First analyze sentiment for each review
      const reviewsWithSentiment = await Promise.all(
        reviewsData.map(async (review) => {
          // Skip analysis if review already has sentiment data
          if (review.sentiment && review.sentimentLabel) {
            return review;
          }

          const sentiment = await analyzeSentiment(review.reviewText);
          return {
            ...review,
            sentiment: sentiment ? sentiment.score : null,
            sentimentLabel: sentiment ? sentiment.label : null
          };
        })
      );

      // Update reviews with sentiment data
      setReviews(reviewsWithSentiment);

      // Calculate sentiment summary
      const sentimentSummary = calculateSentimentSummary(reviewsWithSentiment);
      setSentimentData(sentimentSummary);
    } catch (error) {
      console.error("Error processing sentiment:", error);
      toast.error("Failed to analyze sentiment");
    }
  };

  const getRandomLetter = () => {
    const initials = 'AKLMNPRSTJ';
    return initials[Math.floor(Math.random() * initials.length)];
  };

  const analyzeSentiment = async (text) => {
    try {
      const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        console.error('GROQ API key is missing');
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
            'Authorization': `Bearer ${GROQ_API_KEY}`,
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
  };

  const calculateSentimentSummary = (reviewsWithSentiment) => {
    const filteredReviews = reviewsWithSentiment.filter(review =>
      review.sentimentLabel !== null && review.sentiment !== null
    );

    if (filteredReviews.length === 0) {
      return {
        positivePercentage: 0,
        neutralPercentage: 0,
        negativePercentage: 0,
        topKeywords: [],
        averageRating: 0
      };
    }

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let allText = '';

    filteredReviews.forEach(review => {
      if (review.sentimentLabel === 'positive' || review.sentiment > 0.33) {
        positive++;
      } else if (review.sentimentLabel === 'negative' || review.sentiment < -0.33) {
        negative++;
      } else {
        neutral++;
      }

      allText += ' ' + review.reviewText;
    });

    const total = filteredReviews.length;

    const positivePercentage = Math.round((positive / total) * 100);
    const neutralPercentage = Math.round((neutral / total) * 100);
    const negativePercentage = Math.round((negative / total) * 100);

    const topKeywords = extractTopKeywords(allText);
    const averageRating = calculateAverageRating(filteredReviews);

    return {
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      topKeywords,
      averageRating
    };
  };

  const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const extractTopKeywords = (text) => {
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
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderSentimentBadge = (sentiment, sentimentLabel) => {
    if (!sentiment && !sentimentLabel) return null;

    let badgeClass;
    let label;

    if (sentimentLabel === 'positive' || sentiment > 0.33) {
      badgeClass = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300';
      label = 'Positive';
    } else if (sentimentLabel === 'negative' || sentiment < -0.33) {
      badgeClass = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
      label = 'Negative';
    } else {
      badgeClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      label = 'Neutral';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-25 bg-neutral-900">
      {/* Header Section */}
      <div className="text-center mb-10">
        <span className="inline-block bg-amber-600 text-white px-4 py-1 rounded-full text-sm mb-2">
          Customer Feedback
        </span>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          Community Reviews &amp; Sentiment Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          AI-powered review analysis system that provides valuable insights into customer feedback and sentiment trends.
        </p>
      </div>

      {/* Dashboard Container */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Panel - Review Form */}
        <div className="w-full md:w-1/2 ">
          <div className="bg-white dark:bg-neutral-700 rounded-lg overflow-hidden shadow-md bg-neutral-600">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Share Your Experience</h2>
                  <p className="text-gray-600 dark:text-gray-400">Tell us about your experience with our eco-friendly marketplace</p>
                </div>
                <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 bg-opacity-50 px-3 py-1 rounded-full text-sm">
                  <span>Give Review</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.48 0-2.874-.32-4.083-.89L3 21l1.417-3.43C3.495 15.946 3 14.035 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>


              </div>
            </div>

            {/* Review Form */}
            <div className="bg-gray-50 dark:bg-neutral-800 p-6">
              {!isLoaded || !isSignedIn ? (
                <div className="text-center py-4">
                  <p className="text-neutral-600 dark:text-gray-300 mb-4">
                    Please sign in to submit a review
                  </p>
                  <button
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition duration-300"
                    onClick={() => window.location.href = "/sign-in"}
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4 ">
                    <label
                      htmlFor="rating"
                      className="block text-gray-700 dark:text-gray-300 mb-2 font-medium"
                    >
                      Rating
                    </label>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-8 w-8 ${star <= rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="review"
                      className="block text-neutral-700 dark:text-neutral-300 mb-2 font-medium"
                    >
                      Your Review
                    </label>
                    <textarea
                      id="review"
                      rows="4"
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Share your experience with our eco-friendly marketplace..."
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition duration-300 flex justify-center"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Review Stats */}
            <div className="bg-gray-50 dark:bg-neutral-800 p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Total Reviews</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{reviews.length}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Average Rating</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {sentimentData ? sentimentData.averageRating : "0.0"}
                    <span className="text-sm ml-1">/ 5</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Positive Feedback</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {sentimentData ? sentimentData.positivePercentage : "0"}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Sentiment Analysis */}
        <div className="w-full md:w-1/2 ">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-md mb-6 bg-neutral-600">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
              Sentiment Analysis Insights
            </h2>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 p-4 rounded-md">
                {error}
              </div>
            ) : (
              <div className="space-y-6 ">
                {/* Sentiment Analysis Visualization */}
                {sentimentData && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-3">Sentiment Distribution</h4>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                      <div
                        className="flex rounded-full h-4"
                        style={{ width: '100%' }}
                      >
                        <div
                          className="bg-green-500 rounded-l-full"
                          style={{ width: `${sentimentData.positivePercentage}%` }}
                        ></div>
                        <div
                          className="bg-gray-400"
                          style={{ width: `${sentimentData.neutralPercentage}%` }}
                        ></div>
                        <div
                          className="bg-red-500 rounded-r-full"
                          style={{ width: `${sentimentData.negativePercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Positive ({sentimentData.positivePercentage}%)</span>
                      <span>Neutral ({sentimentData.neutralPercentage}%)</span>
                      <span>Negative ({sentimentData.negativePercentage}%)</span>
                    </div>
                  </div>
                )}

                {/* How Sentiment Analysis Works */}
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-white mb-3">How Sentiment Analysis Works</h4>

                  {/* AI Analysis */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="bg-amber-600 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 dark:text-gray-300">AI-Powered Analysis</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Our AI model analyzes review text to determine sentiment, identifying positive, negative, and neutral opinions.
                      </p>
                    </div>
                  </div>

                  {/* Keyword Extraction */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="bg-amber-600 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 dark:text-gray-300">Keyword Extraction</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        We automatically identify key topics and themes mentioned across customer reviews.
                      </p>
                    </div>
                  </div>

                  {/* Trend Tracking */}
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-600 p-3 rounded-lg">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 dark:text-gray-300">Trend Tracking</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Monitoring sentiment changes over time helps identify trends and areas for improvement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top Keywords */}
                {sentimentData && sentimentData.topKeywords && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-3">Top Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {sentimentData.topKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-300 rounded-full text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Reviews List - Results Section */}
      <div className="mt-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Recent Reviews
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 p-4 rounded-md">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {reviews.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-gray-500 dark:text-gray-400">
                  No reviews available yet. Be the first to share your experience!
                </div>
              ) : (
                // Sort reviews by date (newest first) and take only the first 5
                [...reviews]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 5)
                  .map((review) => (
                    <div
                      key={review._id}
                      className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="bg-amber-100 dark:bg-amber-900 h-10 w-10 rounded-full flex items-center justify-center text-amber-800 dark:text-amber-300 font-semibold">
                            {getRandomLetter()}
                          </div>

                          <div className="ml-3">
                            <p className="text-gray-700 dark:text-gray-300">
                              {review.reviewText}
                            </p>
                          </div>
                        </div>
                        {renderSentimentBadge(review.sentiment, review.sentimentLabel)}
                      </div>

                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatDate(review.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-4 w-4 ${i < review.rating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>







    </div>
  )
};

export default ReviewDashboard;
