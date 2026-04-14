import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import {
  acceptRide as acceptRideAPI,
  rejectRide as rejectRideAPI,
  getDriver,
  updateRideStatus,
  getRideByBookingId,
  createPayment,
  getDriverReviews,
  getDriverRating,
  getDriverRevenue,
  logout,
} from "../api/api";
import { getRouteInfo, reverseGeocode } from "../../services/osrm";

const driverIcon = new L.Icon({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pickupIcon = new L.Icon({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function RouteToPickup({ from, to, vehicle }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    const router = L.Routing.osrmv1({
      serviceUrl: "https://router.project-osrm.org/route/v1",
      profile: vehicle === "motorbike" ? "bike" : "car",
    });

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(from.lat, from.lng),
        L.latLng(to.lat, to.lng),
      ],
      router,
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      draggableWaypoints: false,
    }).addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [from, to, vehicle, map]);

  return null;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteCalcRef = useRef(0);
  const activeRideRef = useRef(null);
  const orderRef = useRef(null);

  const [status, setStatus] = useState("OFFLINE");
  const [driver, setDriver] = useState({});
  const [driverId, setDriverId] = useState(null);
  const [position, setPosition] = useState(null);
  const [order, setOrder] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [rideStatus, setRideStatus] = useState(null);
  const [rideId, setRideId] = useState(null);
  const [pickupRoute, setPickupRoute] = useState(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [latestReview, setLatestReview] = useState(null);
  const [avgRating, setAvgRating] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const locked = !!activeRide && rideStatus !== "COMPLETED";

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    loadDriver();
    if (wsRef.current) return;

    const ws = new WebSocket("ws://localhost:3005");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "ASSIGN_RIDE") {
        if (activeRideRef.current) return;

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

      if (msg.type === "BOOKING_CANCELLED") {
        const currentOrder = orderRef.current;
        if (currentOrder && msg.data?.bookingId === currentOrder.bookingId) {
          setOrder(null);
        }
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

  useEffect(() => {
    const calcPickupRoute = async () => {
      if (!activeRide || !position) return;

      const now = Date.now();
      if (now - lastRouteCalcRef.current < 15000) return;
      lastRouteCalcRef.current = now;

      const from = { lat: position[0], lng: position[1] };
      const vehicleProfile = driver.vehicleType === "BIKE" ? "motorbike" : "car";

      try {
        const info = await getRouteInfo(from, activeRide.pickup, vehicleProfile);
        setPickupRoute(info);
      } catch (err) {
        console.error("Route to pickup error:", err);
      }
    };

    calcPickupRoute();
  }, [activeRide, position, driver.vehicleType]);

  const loadDriver = async () => {
    try {
      const res = await getDriver();
      const { id, ...driverData } = res.data;
      setDriverId(id);
      setDriver(driverData);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        handleUnauthorized();
        return;
      }
      console.error(err);
    }
  };

  const handleUnauthorized = () => {
    navigate("/driver");
  };

  const loadReviewData = async (id) => {
    if (!id) return;

    try {
      const [reviewsRes, ratingRes] = await Promise.all([
        getDriverReviews(id),
        getDriverRating(id),
      ]);

      const reviews = reviewsRes?.data || [];
      const sorted = [...reviews].sort((a, b) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setLatestReview(sorted[0] || null);

      const ratingValue = ratingRes?.data?.avgRating;
      setAvgRating(ratingValue ? Number(ratingValue).toFixed(1) : null);
    } catch (err) {
      if (err?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error("Load review error:", err);
    }
  };

  useEffect(() => {
    if (!driverId) return;
    loadReviewData(driverId);
    loadRevenue();
  }, [driverId]);

  const loadRevenue = async () => {
    try {
      const res = await getDriverRevenue();
      const total = res?.data?.total ?? 0;
      setTotalRevenue(Number(total));
    } catch (err) {
      if (err?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error("Load revenue error:", err);
    }
  };

  const sendGPS = (lat, lng, vehicleType) => {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "GPS_UPDATE",
          lat,
          lng,
          vehicleType: vehicleType.toUpperCase()
        })
      );
    }
  };

  const start = async () => {
    const ws = wsRef.current;

    if (!ws) {
      alert("WS chua khoi tao");
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

  const fetchRideByBookingId = async (bookingId, attempts = 5) => {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await getRideByBookingId(bookingId);
        return res.data;
      } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return null;
  };

  const acceptRide = async () => {
    if (!order) return;

    try {
      await acceptRideAPI(order.bookingId);
      setActiveRide(order);
      setRideStatus("ONGOING");
      setPaymentDone(false);
      setPickupRoute(null);
      setOrder(null);

      const ride = await fetchRideByBookingId(order.bookingId);
      if (ride) {
        setRideId(ride._id || ride.id);
      }
    } catch (err) {
      console.error("Accept error:", err);
    }
  };

  const rejectRide = async () => {
    if (!order) return;

    try {
      await rejectRideAPI(order.bookingId);
      setOrder(null);
    } catch (err) {
      console.error("Reject error:", err);
    }
  };

  const completeRide = async () => {
    if (!rideId) return;

    try {
      await updateRideStatus(rideId, "COMPLETED");
      setRideStatus("COMPLETED");
    } catch (err) {
      if (err?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error("Complete error:", err);
    }
  };

  const completePayment = async () => {
    if (!activeRide?.bookingId) return;

    try {
      await createPayment({
        bookingId: activeRide.bookingId,
        method: "CASH",
      });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "CLEAR_ASSIGNMENT" }));
      }
      setPaymentDone(true);
      if (driverId) {
        setTimeout(() => loadReviewData(driverId), 3000);
      }
      await loadRevenue();
      setActiveRide(null);
      setRideId(null);
      setPickupRoute(null);
      setRideStatus(null);
    } catch (err) {
      if (err?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error("Payment error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (_) {
      // Ignore logout API failures and force local redirect.
    } finally {
      handleUnauthorized();
    }
  };

  const routeFrom = position
    ? { lat: position[0], lng: position[1] }
    : null;

  const routeVehicle = driver.vehicleType === "BIKE" ? "motorbike" : "car";

  return (
    <div className="h-screen grid grid-cols-12 gap-3 p-4 bg-gray-100">
      {/* LEFT */}
      <div className="col-span-3 bg-white rounded shadow p-4">
        <h1 className="text-lg font-bold mb-3">Tai xe</h1>
        <p className="mb-2">Ten: <b>{driver.name}</b></p>
        <p className="mb-2">So dien thoai: <b>{driver.phone}</b></p>
        <p className="mb-2">Loai xe: <b>{driver.vehicleType}</b></p>

        <p>
          Trang thai:
          <b className={status === "ONLINE" ? "text-green-600" : "text-gray-500"}>
            {" "}{status}
          </b>
        </p>

        <div className="mt-4 space-x-2">
          <button
            onClick={start}
            disabled={status === "ONLINE" || locked}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Online
          </button>
          <button
            onClick={stop}
            disabled={locked}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Offline
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-3 bg-gray-800 text-white py-2 rounded"
        >
          Dang xuat
        </button>

        <div className="mt-4 border rounded p-3">
          <h3 className="font-semibold mb-2">Danh gia tu khach</h3>
          {latestReview ? (
            <div className="text-sm space-y-1">
              <p>So sao: <b>{latestReview.rating}</b></p>
              <p>Nhan xet: <span className="text-gray-700">{latestReview.comment || "Khong co"}</span></p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Chua co danh gia</p>
          )}
          {avgRating && (
            <p className="text-sm mt-2">Diem trung binh: <b>{avgRating}</b></p>
          )}
        </div>

        <div className="mt-4 border rounded p-3">
          <h3 className="font-semibold mb-2">Tong doanh thu</h3>
          <p className="text-lg font-bold">{Number(totalRevenue).toLocaleString()} d</p>
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
            {activeRide?.pickup && (
              <Marker
                position={[activeRide.pickup.lat, activeRide.pickup.lng]}
                icon={pickupIcon}
              />
            )}
            {routeFrom && activeRide?.pickup && (
              <RouteToPickup from={routeFrom} to={activeRide.pickup} vehicle={routeVehicle} />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Bam Online de bat dau gui GPS
          </div>
        )}
      </div>

      {/* RIGHT */}
        <div className="col-span-3 bg-white rounded shadow p-4">
          <h2 className="text-lg font-bold mb-3">Ghep chuyen</h2>

        {!order && !activeRide && (
          <p className="text-gray-500 text-sm">Chua co cuoc xe nao</p>
        )}

        {order && !activeRide && (
          <div className="border rounded p-3">
            <p><b>Diem don:</b> {order.pickupAddress}</p>
            <p><b>Diem tra:</b> {order.dropoffAddress}</p>
            <p><b>Khoang cach:</b> {order.distanceKm} km</p>
            <p><b>Thoi gian:</b> {order.durationMin} phut</p>
            <p><b>Gia:</b> {order.price}d</p>

            <div className="flex gap-2 mt-3">
              <button onClick={acceptRide} className="flex-1 bg-green-600 text-white py-2 rounded">
                Nhan cuoc
              </button>
              <button onClick={rejectRide} className="flex-1 bg-gray-300 py-2 rounded">
                Tu choi
              </button>
            </div>
          </div>
        )}

        {activeRide && (
          <div className="border rounded p-3">
            <p><b>Diem don:</b> {activeRide.pickupAddress}</p>
            <p><b>Diem tra:</b> {activeRide.dropoffAddress}</p>
            <p><b>Gia:</b> {activeRide.price}d</p>
            {pickupRoute && (
              <p><b>Duong ngan nhat den diem don:</b> {pickupRoute.distanceKm} km, {pickupRoute.durationMin} phut</p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={completeRide}
                disabled={rideStatus === "COMPLETED"}
                className="flex-1 bg-green-600 text-white py-2 rounded disabled:opacity-50"
              >
                Hoan thanh chuyen
              </button>
              <button
                onClick={completePayment}
                disabled={paymentDone || rideStatus !== "COMPLETED"}
                className="flex-1 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
              >
                Thanh toan thanh cong
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
