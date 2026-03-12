import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";

function Routing({ from, to, vehicle }) {
  const map = useMap();

  useEffect(() => {
    if (!from || !to) return;

    // ❗ BẮT BUỘC phải dùng base URL, KHÔNG tự gắn /car hay /bike
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

    routingControl.on("routesfound", (e) => {
      console.log("Route OK:", e.routes[0]);
    });

    routingControl.on("routingerror", (e) => {
      console.error("Routing error:", e);
    });

    return () => {
      map.removeControl(routingControl);
    };
  }, [from, to, vehicle, map]);

  return null;
}

export default function MapView({ from, to, vehicle }) {
  const [currentPos, setCurrentPos] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Bạn chưa cấp quyền truy cập vị trí");
      },
      { enableHighAccuracy: true }
    );
  }, []);

  if (!currentPos) {
    return <div className="h-full flex items-center justify-center">Đang lấy vị trí...</div>;
  }

  return (
    <MapContainer
      center={[currentPos.lat, currentPos.lng]}
      zoom={14}
      className="h-full w-full rounded-lg"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[currentPos.lat, currentPos.lng]} />

      {from && to && <Routing from={from} to={to} vehicle={vehicle} />}
    </MapContainer>
  );
}