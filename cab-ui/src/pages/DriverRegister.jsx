import { useState } from "react";
import { register } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function DriverRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
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
        role: "DRIVER",
        name,
        phone,
        vehicleType,
      });
      navigate("/driver");
    } catch (err) {
      setError(err.response?.data?.message || "Dang ky tai xe that bai");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96">
        <h1 className="text-xl font-semibold mb-4 text-center">Dang ky tai xe</h1>

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
          placeholder="Mat khau"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="Ho ten"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="So dien thoai"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <label className="block text-sm mb-1">Loai xe</label>
        <select
          className="border p-2 w-full mb-4 rounded"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="CAR">CAR</option>
          <option value="BIKE">BIKE</option>
        </select>

        <button
          disabled={loading}
          className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Dang dang ky..." : "Dang ky tai xe"}
        </button>

        <p className="text-sm text-center mt-3">
          Da co tai khoan?{" "}
          <button
            type="button"
            className="text-blue-600"
            onClick={() => navigate("/driver")}
          >
            Dang nhap tai xe
          </button>
        </p>
      </form>
    </div>
  );
}
