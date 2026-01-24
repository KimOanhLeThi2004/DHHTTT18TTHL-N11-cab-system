const express = require('express');
const router = express.Router();
const controller = require('../controller/booking.controller');

router.post('/', controller.createBooking);
router.get('/', controller.getAllBookings);
router.get('/:id', controller.getBookingById);
router.put('/:id/assign-driver', controller.assignDriver);
router.put('/:id/status', controller.updateStatus);
router.delete('/:id', controller.deleteBooking);

module.exports = router;
