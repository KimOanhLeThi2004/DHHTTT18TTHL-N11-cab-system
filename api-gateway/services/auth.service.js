const axios = require("axios");
const { AUTH_SERVICE_URL } = require("../config");

async function introspectToken(token) {
  const res = await axios.get(
    `${AUTH_SERVICE_URL}/auth/isLogin`,
    {
      headers: {
        Authorization: token
      }
    }
  );


  return res.data; // { active, user }
}

async function login(email, password, role) {
  try {
    const res = await axios.post(
      `${AUTH_SERVICE_URL}/auth/login`,
      { email, password, role },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    return res.data;
  } catch (err) {
    // Nếu auth-service có response (401, 404, 400...)
    if (err.response) {
      // Forward nguyên status + body cho frontend
      const { status, data } = err.response;

      // Ném lỗi có cấu trúc để frontend đọc được message
      const e = new Error(data?.message || "Auth service error");
      e.status = status;
      e.data = data;
      throw e;
    }

    // Lỗi mạng / timeout
    const e = new Error("Auth service unavailable");
    e.status = 503;
    throw e;
  }
}

async function register(email, password, role, name, phone, vehicleType) {
  const res = await axios.post(
    `${AUTH_SERVICE_URL}/auth/register`,
    {email, password, role, name, phone, vehicleType},
    {
      headers: {
         "Content-Type": "application/json"
      },
      
    }
  );


  return res.data;
}

async function logout(refreshToken) {
  const res = await axios.post(
    `${AUTH_SERVICE_URL}/auth/logout`,
{ refreshToken },
    {
      headers: {
         "Content-Type": "application/json"
      },
      
    }
  );


  return res.data;
}


module.exports = { introspectToken, login, register, logout };
