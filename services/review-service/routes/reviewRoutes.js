const express = require('express');
const router = express.Router();

const { createReview, getReviewsByTarget, getAverageRating } = require('../controllers/reviewController');

router.post('/', createReview);
router.get('/:user_id', getReviewsByTarget);
router.get('/:user_id/stats', getAverageRating);

module.exports = router;