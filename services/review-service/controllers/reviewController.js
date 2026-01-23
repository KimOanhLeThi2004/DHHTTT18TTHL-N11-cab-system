const Review = require('../models/review');
const { Op } = require('sequelize'); // Toán tử của Sequelize

exports.createReview = async (req, res) => {
  try {
    const { booking_id, reviewer_id, reviewee_id, role, rating, comment } = req.body;

    // Kiểm tra trùng lặp: Một người chỉ đánh giá 1 lần cho 1 booking
    const existing = await Review.findOne({
      where: { booking_id, reviewer_id }
    });

    if (existing) {
      return res.status(400).json({ message: 'Bạn đã đánh giá chuyến đi này rồi.' });
    }

    const newReview = await Review.create({
      booking_id, reviewer_id, reviewee_id, role, rating, comment
    });

    res.status(201).json({ success: true, data: newReview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReviewsByTarget = async (req, res) => {
  try {
    const { user_id } = req.params;
    // Tìm các review mà user_id là người ĐƯỢC đánh giá (reviewee)
    const reviews = await Review.findAll({
      where: { reviewee_id: user_id },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tính rating trung bình
exports.getAverageRating = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Tính toán aggregate bằng Sequelize
    const result = await Review.findOne({
      where: { reviewee_id: user_id },
      attributes: [
        [Review.sequelize.fn('AVG', Review.sequelize.col('rating')), 'avgRating'],
        [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'totalReviews']
      ],
      raw: true
    });

    const avgRating = result.avgRating ? parseFloat(result.avgRating).toFixed(1) : 0;
    const totalReviews = result.totalReviews || 0;

    res.json({ success: true, average_rating: avgRating, total_reviews: totalReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};