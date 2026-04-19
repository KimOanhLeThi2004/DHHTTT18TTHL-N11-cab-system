const { User } = require('../models');

/**
 * Create user (được gọi từ event USER_CREATED)
 */
exports.createUser = async (req, res) => {
  try {

    const { id, email,  name, phone } = req.body;
    console.log(req.body)
    const existed = await User.findByPk(id);

    if (existed) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      id,
      email,
      name, 
      phone
    });

    return res.status(201).json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Get profile (JWT verify ở Gateway)
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Update profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, avatar } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      updates.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone !== null && typeof phone !== "string") {
        return res.status(400).json({ message: "phone must be a string" });
      }
      updates.phone = phone;
    }

    if (avatar !== undefined) {
      if (avatar !== null && typeof avatar !== "string") {
        return res.status(400).json({ message: "avatar must be a string" });
      }
      updates.avatar = avatar;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No updatable fields provided" });
    }

    await user.update(updates);
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id ;
    console.log(userId)
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
