import { useEffect, useState, useRef } from "react";
import AutocompleteInput from "./AutocompleteInput";
import { getMe, logout } from "../api/api";

export default function Navbar({ onSearch }) {
  const [fromPos, setFromPos] = useState(null);
  const [toPos, setToPos] = useState(null);
  const [vehicle, setVehicle] = useState("CAR");
  const [fromText, setFromText] = useState("");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [openMenu, setOpenMenu] = useState(false);

  const menuRef = useRef(null);

  // Load user
  useEffect(() => {
  const loadMe = async () => {
    const token = localStorage.getItem("accessToken");

    // 👉 Chưa login thì khỏi gọi API
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }

    try {
      const data = await getMe(); // gọi /users/me qua gateway
      setUser(data);
    } catch (err) {
      // Token hết hạn / invalid → clear & coi như logout
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  loadMe();
}, []);

  // Close dropdown when click outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Get current location
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();

          setFromText(data.display_name || "Vị trí hiện tại");
          setFromPos({ lat, lng });
        } catch {}
      },
      () => {}
    );
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      
      await logout(refreshToken);

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
      alert("Đăng xuất thất bại");
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="relative z-[9999] bg-white shadow p-3 flex justify-between items-center">
        <div className="font-bold">🚕 Cab System</div>

        {loadingUser ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : user ? (
          <div className="relative" ref={menuRef}>
            <div
              onClick={() => setOpenMenu((v) => !v)}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>

              <span className="text-sm font-medium">{user.name}</span>

              <svg
                className={`w-4 h-4 transition-transform ${
                  openMenu ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {openMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg overflow-hidden">
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  👤 Thông tin tài khoản
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <a href="/login" className="text-blue-600 text-sm">
            Đăng nhập
          </a>
        )}
      </nav>

      {/* SEARCH BAR */}
      <div className="bg-white shadow p-4 flex gap-3 items-center relative z-[9998]">
        <AutocompleteInput
          placeholder="Điểm đi"
          defaultValue={fromText}
          onSelect={(pos) => setFromPos(pos)}
        />

        <AutocompleteInput
          placeholder="Điểm đến"
          onSelect={(pos) => setToPos(pos)}
        />

        <select
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="BIKE">Xe máy</option>
          <option value="CAR">Ô tô</option>
        </select>

        <button
          onClick={() => {
            if (!fromPos || !toPos)
              return alert("Vui lòng chọn đủ điểm đi & đến");
            onSearch(fromPos, toPos, vehicle);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Tìm đường
        </button>
      </div>
    </>
  );
}