import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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
import { canUseBrowserGeolocation, resolveGatewayWsUrl } from "../utils/runtime";

const ACCESS_TOKEN_SESSION_KEY = "cab_access_token_session";
const DRIVER_WS_RECONNECT_DELAY_MS = 1500;
const WS_CONNECT_TIMEOUT_MS = 8000;
const MAX_GEO_ACCURACY_METERS = 5000;
const DRIVER_MAP_FALLBACK_CENTER = [10.7769, 106.7009];

function readAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY);
}

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

function ManualGpsPicker({ enabled, onPick }) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      const lat = Number(event.latlng?.lat);
      const lng = Number(event.latlng?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      onPick(lat, lng);
    },
  });

  return null;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastRouteCalcRef = useRef(0);
  const activeRideRef = useRef(null);
  const orderRef = useRef(null);
  const driverIdRef = useRef(null);
  const wsReconnectTimerRef = useRef(null);
  const unmountedRef = useRef(false);

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
  const [manualGpsMode, setManualGpsMode] = useState(false);

  const locked = !!activeRide && rideStatus !== "COMPLETED";

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    driverIdRef.current = driverId;
  }, [driverId]);

  const handleUnauthorized = useCallback(() => {
    navigate("/driver");
  }, [navigate]);

  const loadDriver = useCallback(async () => {
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
  }, [handleUnauthorized]);

  const loadReviewData = useCallback(async (id) => {
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
  }, [handleUnauthorized]);

  const loadRevenue = useCallback(async () => {
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
  }, [handleUnauthorized]);

  const clearWsReconnectTimer = useCallback(() => {
    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }
  }, []);

  const sendWsAuth = useCallback((ws) => {
    const token = readAccessToken();
    if (token && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "AUTH", token }));
    }
  }, []);

  const waitForWebSocketOpen = useCallback(async (ws) => {
    if (!ws) return false;
    if (ws.readyState === WebSocket.OPEN) return true;

    return new Promise((resolve) => {
      let resolved = false;
      let timeoutId = null;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        ws.removeEventListener("open", handleOpen);
        ws.removeEventListener("error", handleError);
        ws.removeEventListener("close", handleClose);
        resolve(result);
      };

      const handleOpen = () => finish(true);
      const handleError = () => finish(false);
      const handleClose = () => finish(false);

      timeoutId = setTimeout(() => finish(false), WS_CONNECT_TIMEOUT_MS);
      ws.addEventListener("open", handleOpen);
      ws.addEventListener("error", handleError);
      ws.addEventListener("close", handleClose);
    });
  }, []);

  const connectDriverSocket = useCallback(() => {
    const current = wsRef.current;
    if (
      current &&
      (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)
    ) {
      return current;
    }

    const ws = new WebSocket(resolveGatewayWsUrl("/ws/drivers"));
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS connected");
      sendWsAuth(ws);
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "ASSIGN_RIDE") {
        if (activeRideRef.current) return;
        const assignedDriverId = msg.data?.driverId ?? msg.data?.driver_id ?? null;
        const currentDriverId = driverIdRef.current;
        if (
          assignedDriverId &&
          currentDriverId &&
          String(assignedDriverId) !== String(currentDriverId)
        ) {
          return;
        }

        const pickup = msg.data?.pickup || {};
        const dropoff = msg.data?.dropoff || {};

        const route = await getRouteInfo(
          pickup,
          dropoff,
          "car"
        );

        const pickupAddress =
          pickup.address ||
          (await reverseGeocode(pickup.lat, pickup.lng));

        const dropoffAddress =
          dropoff.address ||
          (await reverseGeocode(dropoff.lat, dropoff.lng));

        setOrder({
          ...msg.data,
          pickup,
          dropoff,
          driverId: assignedDriverId,
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
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      setStatus("OFFLINE");
      setManualGpsMode(false);

      if (!unmountedRef.current) {
        clearWsReconnectTimer();
        wsReconnectTimerRef.current = setTimeout(() => {
          connectDriverSocket();
        }, DRIVER_WS_RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (e) => console.error("WS error:", e);
    return ws;
  }, [clearWsReconnectTimer, sendWsAuth]);

  useEffect(() => {
    unmountedRef.current = false;
    loadDriver();
    connectDriverSocket();

    return () => {
      unmountedRef.current = true;
      clearWsReconnectTimer();

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      setManualGpsMode(false);
    };
  }, [clearWsReconnectTimer, connectDriverSocket, loadDriver]);

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

  useEffect(() => {
    if (!driverId) return;
    loadReviewData(driverId);
    loadRevenue();
  }, [driverId, loadReviewData, loadRevenue]);

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

  const pushManualGps = (lat, lng) => {
    const vehicleType = driver.vehicleType || "CAR";
    setPosition([lat, lng]);
    setStatus("ONLINE");
    sendGPS(lat, lng, vehicleType);
  };

  const start = async () => {
    const ws = connectDriverSocket();

    if (!ws) {
      alert("WS chua khoi tao");
      return;
    }

    const connected = await waitForWebSocketOpen(ws);
    if (!connected || ws.readyState !== WebSocket.OPEN) {
      alert("WS khong the ket noi");
      return;
    }
    sendWsAuth(ws);

    if (watchIdRef.current) return;
    if (!canUseBrowserGeolocation()) {
      setManualGpsMode(true);
      setStatus("ONLINE");
      setPosition((prev) => prev || DRIVER_MAP_FALLBACK_CENTER);
      alert("Trinh duyet khong ho tro geolocation. Hay cham ban do de cap nhat vi tri tai xe.");
      return;
    }

    setManualGpsMode(false);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Number(pos.coords.accuracy);

        if (Number.isFinite(accuracy) && accuracy > MAX_GEO_ACCURACY_METERS) {
          console.warn(`Bo qua toa do do chinh xac thap (${accuracy}m), co the dang dinh vi theo IP`);
          return;
        }

        const vehicleType = driver.vehicleType;
        setPosition([lat, lng]);
        setStatus("ONLINE");
        sendGPS(lat, lng, vehicleType);
      },
      (err) => {
        console.error("watchPosition error:", err);
        if (err?.code === 1 && typeof window !== "undefined" && !window.isSecureContext) {
          if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setManualGpsMode(true);
          setStatus("ONLINE");
          setPosition((prev) => prev || DRIVER_MAP_FALLBACK_CENTER);
          alert("HTTP khong duoc phep lay GPS chinh xac. Hay cham ban do de cap nhat vi tri tai xe.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
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
    }

    setManualGpsMode(false);
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
    const assignedDriverId = order.driverId || order.driver_id || null;
    if (
      assignedDriverId &&
      driverId &&
      String(assignedDriverId) !== String(driverId)
    ) {
      setOrder(null);
      return;
    }

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
      if (err?.response?.status === 403) {
        setOrder(null);
      }
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
    } catch {
      // Ignore logout API failures and force local redirect.
    } finally {
      handleUnauthorized();
    }
  };

  const routeFrom = position
    ? { lat: position[0], lng: position[1] }
    : null;

  const routeVehicle = driver.vehicleType === "BIKE" ? "motorbike" : "car";
  const hasMap = Boolean(position) || manualGpsMode;
  const mapCenter = position || DRIVER_MAP_FALLBACK_CENTER;

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
        {manualGpsMode && (
          <p className="mt-2 text-sm text-amber-700">
            Dang o che do GPS thu cong tren HTTP. Hay cham vao ban do de cap nhat vi tri.
          </p>
        )}

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
        {hasMap ? (
          <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {position && <Marker position={position} icon={driverIcon} />}
            {activeRide?.pickup && (
              <Marker
                position={[activeRide.pickup.lat, activeRide.pickup.lng]}
                icon={pickupIcon}
              />
            )}
            <ManualGpsPicker enabled={manualGpsMode} onPick={pushManualGps} />
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
