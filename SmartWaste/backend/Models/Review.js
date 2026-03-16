import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: 'Anonymous User',
  },
  reviewText: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  sentiment: {
    type: Number,
    default: null,
  },
  sentimentLabel: {
    type: String,
    enum: ['positive', 'negative', 'neutral', null],
    default: null,
  },
}, { timestamps: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
