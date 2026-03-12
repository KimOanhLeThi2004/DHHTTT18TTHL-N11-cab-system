const Review = require("../models/review.model");

exports.createReview = async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDriverReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { driverId: req.params.driverId }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDriverRating = async (req, res) => {
  try {
    const result = await Review.findAll({
      where: { driverId: req.params.driverId },
      attributes: [
        [Review.sequelize.fn("AVG", Review.sequelize.col("rating")), "avgRating"]
      ]
    });

    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
