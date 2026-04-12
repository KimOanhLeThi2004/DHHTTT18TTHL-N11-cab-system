import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";
import { getRouteInfo } from "../../services/osrm";
import {
  createBooking,
  calculatePrice,
  cancelBooking,
  createReview,
  getMe,
  getDriverLocation
} from "../../src/api/api";

export default function Home() {
  const [rideId, setRideId] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
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
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [me, setMe] = useState(null);
  const [reloadPending, setReloadPending] = useState(false);

  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    getMe().then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    if (
      rideStatus === "COMPLETED" &&
      paymentSuccess &&
      !reviewSubmitted &&
      !reviewDismissed
    ) {
      setShowReview(true);
    }
  }, [rideStatus, paymentSuccess, reviewSubmitted, reviewDismissed]);

  useEffect(() => {
    if (rideStatus === "COMPLETED") {
      setReloadPending(true);
    }
  }, [rideStatus]);

  useEffect(() => {
    if (!reloadPending) return;
    if (!paymentSuccess) return;
    if (!reviewSubmitted && !reviewDismissed) return;

    const timer = setTimeout(() => {
      window.location.reload();
    }, 1200);

    return () => clearTimeout(timer);
  }, [reloadPending, paymentSuccess, reviewSubmitted, reviewDismissed]);

  // Open WebSocket when having booking
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3008?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Notification WS connected");
    };

    ws.onclose = () => {
      console.log("WS disconnected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("WS Received:", data);

      if (data.type === "RIDE_STATUS" && data.bookingId === bookingId) {
        if (data.driver) {
          setDriver(data.driver);
          if (data.driver.id) {
            setDriverId(data.driver.id);
          }
        }
        if (data.driverId) {
          setDriverId(data.driverId);
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
            setDriverPosition(null);
            break;
          case "CANCELLED":
            setRideStatus("CANCELLED");
            setDriverPosition(null);
            break;
          default:
            break;
        }
      }

      if (data.type === "DRIVER_LOCATION" && data.bookingId === bookingId) {
        if (Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
          setDriverPosition({
            lat: Number(data.lat),
            lng: Number(data.lng),
          });
        }
      }

      if (data.type === "PAYMENT_SUCCESS" && data.bookingId === bookingId) {
        setPaymentSuccess(true);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
    };

    return () => ws.close();
  }, [bookingId]);

  useEffect(() => {
    if (!driverId || rideStatus !== "ONGOING") {
      return undefined;
    }

    let mounted = true;
    const fetchLocation = async () => {
      try {
        const res = await getDriverLocation(driverId);
        const payload = res?.data;
        if (!mounted || !payload) return;
        if (!Number.isFinite(Number(payload.lat)) || !Number.isFinite(Number(payload.lng))) return;
        setDriverPosition({
          lat: Number(payload.lat),
          lng: Number(payload.lng),
        });
      } catch (_) {
      }
    };

    fetchLocation();
    const timer = setInterval(fetchLocation, 4000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [driverId, rideStatus]);

  const handleBooking = async () => {
    if (!from || !to || !distance || !duration) {
      setError("Vui long chon diem di va diem den truoc khi dat xe");
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Vui long dang nhap truoc khi dat xe");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setRideStatus(null);

      const payload = {
        vehicleType: vehicle.toUpperCase(),
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
        requestTime: new Date().toISOString(),
      };

      const res = await createBooking(payload);
      const nextBookingId = res?.data?.booking_id || res?.data?.bookingId || null;
      if (!nextBookingId) {
        throw new Error("Booking response missing booking id");
      }

      setBookingId(nextBookingId);
      setRideStatus("SEARCHING");
      setPaymentSuccess(false);
      setReviewSubmitted(false);
      setReviewDismissed(false);
      setReloadPending(false);
      setShowReview(false);
      setDriver(null);
      setDriverId(null);
      setDriverPosition(null);
      setRideId(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Dat xe that bai");
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (rideStatus === "SEARCHING")
      return "Dat xe thanh cong! Dang tim tai xe gan ban...";

    if (rideStatus === "ONGOING")
      return (
        <div>
          <p>Tai xe da nhan chuyen! Dang di chuyen den diem don...</p>

          {driver && (
            <div className="mt-2 text-sm bg-white p-2 rounded border">
              <p><b>Tai xe:</b> {driver.name}</p>
              <p><b>SDT:</b> {driver.phone}</p>
              <p><b>Loai xe:</b> {driver.vehicleType}</p>
            </div>
          )}

          {driverPosition && (
            <p className="mt-2 text-sm">
              Tai xe hien tai: <b>{driverPosition.lat.toFixed(5)}, {driverPosition.lng.toFixed(5)}</b>
            </p>
          )}
        </div>
      );

    if (rideStatus === "COMPLETED")
      return "Chuyen di da hoan thanh.";

    if (rideStatus === "CANCELLED")
      return "Chuyen di da bi huy.";

    return null;
  };

  const handleCancelBooking = async () => {
    if (rideStatus !== "SEARCHING") {
      setError("Chi duoc huy khi tai xe chua nhan chuyen");
      return;
    }

    if (!bookingId) return;
    try {
      await cancelBooking(bookingId);
      setRideStatus("CANCELLED");
      setShowReview(false);
      setPaymentSuccess(false);
      setReviewDismissed(false);
      setReloadPending(false);
      setDriver(null);
      setDriverId(null);
      setDriverPosition(null);
      setRideId(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Khong the huy dat xe");
    }
  };

  const handleSubmitReview = async () => {
    if (!me?.id || !driverId || !rideId || !bookingId) {
      setError("Thieu thong tin de gui danh gia");
      return;
    }

    try {
      setReviewSubmitting(true);
      await createReview({
        rideId,
        bookingId,
        reviewerId: me.id,
        driverId,
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      setShowReview(false);
      setReviewDismissed(false);
    } catch (err) {
      console.error(err);
      setError("Khong the gui danh gia");
    } finally {
      setReviewSubmitting(false);
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
              requestTime: new Date().toISOString(),
            };

            const res = await calculatePrice(pricingPayload);
            setPrice(res.data.totalPrice);
          } catch (err) {
            console.error("Pricing error", err);
          }
        }}
      />

      <div className="flex flex-1 p-4 gap-4 bg-gray-100 relative">
        <div className="flex-1 bg-white p-3 rounded-xl shadow">
          <MapView
            from={from}
            to={to}
            vehicle={vehicle}
            driverPosition={driverPosition}
          />
        </div>

        <div className="w-[350px] bg-white p-4 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Thong tin chuyen di</h2>

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
              <p>Khoang cach: <b>{distance} km</b></p>
              <p>Thoi gian du kien: <b>{duration} phut</b></p>
              <p>Loai xe: <b>{vehicle === "motorbike" ? "Xe may" : "O to"}</b></p>
              <p>Gia tam tinh: <b>{price?.toLocaleString()} d</b></p>
            </div>
          ) : (
            <p className="text-gray-500">
              Nhap diem di va diem den de xem thong tin.
            </p>
          )}

          <button
            onClick={handleBooking}
            disabled={loading || rideStatus === "SEARCHING" || rideStatus === "ONGOING"}
            className="w-full mt-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Dang dat xe..."
              : rideStatus === "ONGOING"
              ? "Dang co chuyen"
              : rideStatus === "SEARCHING"
              ? "Dang tim tai xe..."
              : "Dat xe"}
          </button>

          {rideStatus === "SEARCHING" && (
            <button
              onClick={handleCancelBooking}
              className="w-full mt-3 bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
              Huy dat xe
            </button>
          )}
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-5 w-[360px]">
            <h3 className="text-lg font-bold mb-3">Danh gia chuyen di</h3>

            <label className="block text-sm mb-1">So sao</label>
            <select
              className="w-full border rounded p-2 mb-3"
              value={reviewRating}
              onChange={(e) => setReviewRating(e.target.value)}
            >
              <option value={5}>5</option>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
              <option value={1}>1</option>
            </select>

            <label className="block text-sm mb-1">Nhan xet</label>
            <textarea
              className="w-full border rounded p-2 mb-4"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReview(false);
                  setReviewDismissed(true);
                }}
                className="flex-1 bg-gray-200 py-2 rounded"
              >
                De sau
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
              >
                {reviewSubmitting ? "Dang gui..." : "Gui danh gia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
