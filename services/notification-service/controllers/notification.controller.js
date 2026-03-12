const Notification = require("../models/notification.model");

exports.getByUser = async (req, res) => {
  const { userId } = req.params;

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 });

  res.json(notifications);
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;

  await Notification.findByIdAndUpdate(id, { isRead: true });

  res.json({ message: "Marked as read" });
};
