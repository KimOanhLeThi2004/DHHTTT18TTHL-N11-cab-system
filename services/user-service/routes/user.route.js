const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const midldeware = require('../midlewares/auth.middleware') // lấy userid từ jwt
const verifyServiceJwt = require("../midlewares/verifyServiceJwt"); // apigate way jwt

// internal / event
router.post('/', verifyServiceJwt,controller.createUser);

// public (qua API Gateway)
router.get('/me',midldeware,controller.getProfile);
router.put('/me', midldeware,controller.updateProfile);

router.get("/:id", verifyServiceJwt,controller.getUserById);

module.exports = router;
