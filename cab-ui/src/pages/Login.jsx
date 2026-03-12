import { useState } from "react";
import { login } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function CustomerLogin() {
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
      const res = await login(email, password, "CUSTOMER");
      const { accessToken, refreshToken } = res.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("role", "CUSTOMER");

      navigate("/"); // trang khách hàng
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Đăng nhập khách hàng
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
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}