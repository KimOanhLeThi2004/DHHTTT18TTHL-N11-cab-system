import { useState } from "react";
import { login } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password, "DRIVER");
      const { accessToken, refreshToken } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("role", "DRIVER");

      navigate("/driver/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Tài khoản tài xế không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Đăng nhập tài xế
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 mb-3 text-sm rounded">
            {error}
          </div>
        )}

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border p-2 w-full mb-4 rounded"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập tài xế"}
        </button>
      </form>
    </div>
  );
}