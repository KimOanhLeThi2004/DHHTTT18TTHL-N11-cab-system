const express = require("express");
const router = express.Router();
const controller = require("../controllers/notification.controller");

router.post("/", controller.create);
router.get("/:userId", controller.getByUser);
router.put("/read/:id", controller.markAsRead);

module.exports = router;
