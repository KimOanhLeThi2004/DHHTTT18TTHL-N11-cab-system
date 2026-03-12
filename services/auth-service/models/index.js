const sequelize = require("../config/database");
const Credential = require("./credential.model");
const RefreshToken = require("./refreshToken.model");

module.exports = {
  sequelize,
  Credential,
  RefreshToken,
};