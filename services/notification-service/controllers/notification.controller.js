const Notification = require("../models/notification.model");

exports.create = async (req, res) => {
  const { userId, message, title = "Notification", type = "SYSTEM", payload = {} } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ message: "userId and message are required" });
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    payload,
  });

  return res.status(200).json(notification);
};

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
