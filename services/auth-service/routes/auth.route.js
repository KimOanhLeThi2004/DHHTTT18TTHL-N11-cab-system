const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

const isLogin = require('../middlewares/isLogin')

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/isLogin', isLogin,controller.isLogin);
router.post("/logout", controller.logout);

module.exports = router;
