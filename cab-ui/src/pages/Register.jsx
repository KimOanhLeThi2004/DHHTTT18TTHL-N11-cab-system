import { useState } from "react";
import { register } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({
        email,
        password,
        role: "CUSTOMER",
        name,
        phone,
      });

      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow w-96"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">
          Đăng ký tài khoản khách hàng
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
          required
        />

        <input
          type="password"
          className="border p-2 w-full mb-3 rounded"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Họ tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="border p-2 w-full mb-4 rounded"
          placeholder="Số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>

        <p className="text-sm text-center mt-3">
          Đã có tài khoản?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </span>
        </p>
      </form>
    </div>
  );
}