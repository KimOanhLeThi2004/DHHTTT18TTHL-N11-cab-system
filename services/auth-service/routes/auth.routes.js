const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
