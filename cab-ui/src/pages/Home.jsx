import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";
import { getRouteInfo } from "../../services/osrm";
import { createBooking, calculatePrice, updateRideStatus } from "../../src/api/api";


export default function Home() {
  const [rideId, setRideId] = useState(null);
  const [driver, setDriver] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [vehicle, setVehicle] = useState("car");
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rideStatus, setRideStatus] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  const wsRef = useRef(null);

  // ✅ Mở WebSocket khi có booking 
  useEffect(() => {
  const token = localStorage.getItem("accessToken");
    if (!token) return;

 
    console.log(token)
    const ws = new WebSocket(`ws://localhost:3008?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Notification WS connected");
    };

    ws.onclose = () => {
    console.log("❌ WS disconnected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("📩 WS Received:", data);

      // chỉ xử lý đúng booking hiện tại
      if (data.type === "RIDE_STATUS" && data.bookingId === bookingId) {
        if (data.driver) {
          setDriver(data.driver);
        }
        if (data.rideId) {
          setRideId(data.rideId);
        }
        switch (data.status) {
          case "ACCEPTED":
            setRideStatus("ONGOING");
            break;

          case "ONGOING":
            setRideStatus("ONGOING");
            break;

          case "COMPLETED":
            setRideStatus("COMPLETED");
            break;

          case "CANCELLED":
            setRideStatus("CANCELLED");
            break;

          default:
            break;
        }

      }       
      if (data.type === "PAYMENT_SUCCESS") {
        console.log("💳 Payment completed");
      }
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
    };

    return () => ws.close();
  }, [bookingId]);

  const handleBooking = async () => {
    if (!from || !to || !distance || !duration) {
      setError("Vui lòng chọn điểm đi và điểm đến trước khi đặt xe");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if(!token){
      setError("Vui lòng đăng nhập trước khi đặt xe");
      return;
    }else{
      console.log(token)
    }

    try {
      setLoading(true);
      setError("");
      setRideStatus(null);

    const payload = {
      vehicleType: vehicle.toUpperCase(), // đảm bảo CAR thay vì car
      pickup: {
        lat: Number(from.lat),
        lng: Number(from.lng),
        address: from.address,
      },
      dropoff: {
        lat: Number(to.lat),
        lng: Number(to.lng),
        address: to.address,
      },
      distanceKm: Number(distance),
      durationMin: Number(duration),
      requestTime: new Date().toISOString()
    };

      const res = await createBooking(payload);

      setBookingId(res.data.bookingId);
      setRideStatus("SEARCHING");

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Đặt xe thất bại");
    } finally {
      setLoading(false);
    }
  };

const renderStatus = () => {

  if (rideStatus === "SEARCHING")
    return "🚕 Đặt xe thành công! Đang tìm tài xế gần bạn...";

  if (rideStatus === "ONGOING")
    return (
      <div>
        <p>🚗 Tài xế đã nhận chuyến! Đang di chuyển đến điểm đón...</p>

        {driver && (
          <div className="mt-2 text-sm bg-white p-2 rounded border">
            <p><b>Tài xế:</b> {driver.name}</p>
            <p><b>SĐT:</b> {driver.phone}</p>
            <p><b>Loại xe:</b> {driver.vehicleType}</p>
          </div>
        )}
      </div>
    );

  if (rideStatus === "COMPLETED")
    return "✅ Chuyến đi đã hoàn thành.";

  if (rideStatus === "CANCELLED")
    return "❌ Chuyến đi đã bị huỷ.";

  return null;
};

const handleCancelRide = async () => {
  if (!rideId) return;

  try {
    await updateRideStatus(rideId, "CANCELLED");
    setRideStatus("CANCELLED");
  } catch (err) {
    console.error(err);
    setError("Không thể hủy chuyến");
  }
};
const handleCompleteRide = async () => {
  if (!rideId) return;

  try {
    await updateRideStatus(rideId, "COMPLETED");
    setRideStatus("COMPLETED");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    console.error(err);
    setError("Không thể hoàn thành chuyến");
  }
};

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onSearch={async (f, t, v) => {
          setFrom(f);
          setTo(t);
          setVehicle(v);

          const info = await getRouteInfo(f, t, v);

          setDistance(info.distanceKm);
          setDuration(info.durationMin);

          try {
            const pricingPayload = {
              vehicleType: v.toUpperCase(),
              distanceKm: Number(info.distanceKm),
              durationMin: Number(info.durationMin),
              requestTime: new Date().toISOString()
            };

            const res = await calculatePrice(pricingPayload);
            console.log(res)
            setPrice(res.data.totalPrice);

          } catch (err) {
            console.error("Pricing error", err);
          }
        }}
      />

      <div className="flex flex-1 p-4 gap-4 bg-gray-100 relative">
        <div className="flex-1 bg-white p-3 rounded-xl shadow">
          <MapView from={from} to={to} vehicle={vehicle} />
        </div>

        <div className="w-[350px] bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Thông tin chuyến đi</h2>

          {error && (
            <div className="bg-red-100 text-red-600 p-2 mb-3 rounded text-sm">
              {error}
            </div>
          )}

          {rideStatus && (
            <div className="bg-green-100 text-green-700 p-2 mb-3 rounded text-sm">
              {renderStatus()}
            </div>
          )}

          {distance ? (
            <div className="space-y-2">
              <p>📏 Khoảng cách: <b>{distance} km</b></p>
              <p>⏱ Thời gian dự kiến: <b>{duration} phút</b></p>
              <p>🚗 Loại xe: <b>{vehicle === "motorbike" ? "Xe máy" : "Ô tô"}</b></p>
              <p>💰 Giá tạm tính: <b>{price?.toLocaleString()} đ</b></p>
            </div>
          ) : (
            <p className="text-gray-500">
              Nhập điểm đi & điểm đến để xem thông tin.
            </p>
          )}

          <button
            onClick={handleBooking}
            disabled={loading || rideStatus === "SEARCHING" || rideStatus === "ONGOING"}
            className="w-full mt-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Đang đặt xe..."
              : rideStatus === "ONGOING"
              ? "Đang có chuyến"
              : rideStatus === "SEARCHING"
              ? "Đang tìm tài xế..."
              : "Đặt xe"}
          </button>
          {rideStatus === "SEARCHING" && (
  <button
    onClick={handleCancelRide}
    className="w-full mt-3 bg-red-500 text-white py-2 rounded hover:bg-red-600"
  >
    ❌ Hủy chuyến
  </button>
)}

{rideStatus === "ONGOING" && (
  <button
    onClick={handleCompleteRide}
    className="w-full mt-3 bg-green-600 text-white py-2 rounded hover:bg-green-700"
  >
    ✅ Hoàn thành chuyến
  </button>
)}
        </div>
      </div>
    </div>
  );
}