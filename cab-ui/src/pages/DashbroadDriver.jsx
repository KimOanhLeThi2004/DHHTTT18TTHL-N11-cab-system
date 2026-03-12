import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { acceptRide as acceptRideAPI, rejectRide as rejectRideAPI, getDriver } from "../api/api";
import { getRouteInfo, reverseGeocode } from "../../services/osrm";





const driverIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function DriverDashboard() {
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);

  const [status, setStatus] = useState("OFFLINE");
  const [driver, setDriver] = useState({}); // sau này lấy từ API /me
  const [position, setPosition] = useState(null);
  // const [vehicleType, setVehicleType] = useState("");
  const [order, setOrder] = useState(null);

  // 🔌 Kết nối WebSocket
  useEffect(() => {
    loadDriver();
    if (wsRef.current) return;
    const token = localStorage.getItem("accessToken");
    const ws = new WebSocket("ws://localhost:3005");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "AUTH", token }));
      console.log("WS connected");
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "ASSIGN_RIDE") {

        const route = await getRouteInfo(
          msg.data.pickup,
          msg.data.dropoff,
          "car"
        );

        const pickupAddress = await reverseGeocode(
          msg.data.pickup.lat,
          msg.data.pickup.lng
        );

        const dropoffAddress = await reverseGeocode(
          msg.data.dropoff.lat,
          msg.data.dropoff.lng
        );

        setOrder({
          ...msg.data,
          pickupAddress,
          dropoffAddress,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin
        });
      }
    };
    ws.onclose = () => {
      console.log("WS closed");
      setStatus("OFFLINE");
    };

    ws.onerror = (e) => console.error("WS error:", e);

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      ws.close();
    };
  }, []);
  const loadDriver = async () => {
    try {
      const res = await getDriver();
       const { id, ...driverData } = res.data; // bỏ id
        setDriver(driverData);
    } catch (err) {
      console.error(err);
    }
  };


  // 📡 gửi GPS an toàn
const sendGPS = (lat, lng, vehicleType) => {
  const ws = wsRef.current;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "GPS_UPDATE",
        lat,
        lng,
        vehicleType: vehicleType.toUpperCase() // thêm dòng này
      })
    );
  }
};

  // ▶ Online
 const start = async () => {
  const ws = wsRef.current;

  if (!ws) {
    alert("WS chưa khởi tạo");
    return;
  }

  if (ws.readyState !== WebSocket.OPEN) {
    await new Promise((r) => {
      ws.onopen = r;
    });
  }

  if (watchIdRef.current) return;

  watchIdRef.current = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const vehicleType = driver.vehicleType;
      setPosition([lat, lng]);
      setStatus("ONLINE");
      sendGPS(lat, lng, vehicleType);
    },
    console.error,
    { enableHighAccuracy: true }
  );
};

  // ⏹ Offline
  const stop = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "OFFLINE" }));
      ws.close();
    }

    setStatus("OFFLINE");
  };

const acceptRide = async () => {
  if (!order) return;

  try {
    await acceptRideAPI(order.bookingId);
    console.log("Driver accepted:", order.bookingId);
    setOrder(null);
  } catch (err) {
    console.error("Accept error:", err);
  }
};

const rejectRide = async () => {
  if (!order) return;

  try {
    await rejectRideAPI(order.bookingId);
    console.log("Driver rejected:", order.bookingId);
    setOrder(null);
  } catch (err) {
    console.error("Reject error:", err);
  }
};

  return (
    <div className="h-screen grid grid-cols-12 gap-3 p-4 bg-gray-100">
      {/* LEFT */}
      <div className="col-span-3 bg-white rounded shadow p-4">
        <h1 className="text-lg font-bold mb-3">🚕 Tài xế</h1>
        <p className="mb-2">Tên: <b>{driver.name}</b></p>
        <p className="mb-2">Số Điện Thoại: <b>{driver.phone}</b></p>
        <p className="mb-2">Loại xe: <b>{driver.vehicleType}</b></p>

        <p>
          Trạng thái:
          <b className={status === "ONLINE" ? "text-green-600" : "text-gray-500"}>
            {" "}{status}
          </b>
        </p>

        <div className="mt-4 space-x-2">
          <button
            onClick={start}
            disabled={status === "ONLINE"}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Online
          </button>
          <button
            onClick={stop}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Offline
          </button>
        </div>
      </div>

      {/* CENTER */}
      <div className="col-span-6 bg-white rounded shadow overflow-hidden">
        {position ? (
          <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} icon={driverIcon} />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Bấm Online để bắt đầu gửi GPS 📍
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="col-span-3 bg-white rounded shadow p-4">
        <h2 className="text-lg font-bold mb-3">📢 Ghép chuyến</h2>

        {!order && <p className="text-gray-500 text-sm">Chưa có cuốc xe nào</p>}

        {order && (
          <div className="border rounded p-3">
            <p><b>Điểm đón:</b> {order.pickupAddress}</p>
            <p><b>Điểm trả:</b> {order.dropoffAddress}</p>
            <p><b>Khoảng cách:</b> {order.distanceKm} km</p>
            <p><b>Thời gian:</b> {order.durationMin} phút</p>
            <p><b>Giá:</b> {order.price}đ</p>

            <div className="flex gap-2 mt-3">
              <button onClick={acceptRide} className="flex-1 bg-green-600 text-white py-2 rounded">
                Nhận cuốc
              </button>
              <button onClick={rejectRide} className="flex-1 bg-gray-300 py-2 rounded">
                Từ chối
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}