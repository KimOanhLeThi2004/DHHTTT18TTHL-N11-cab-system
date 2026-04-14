const axios = require("axios");
const { enhanceAxiosClient } = require("./mtls");

module.exports = enhanceAxiosClient(axios.create(), "auth-service");
