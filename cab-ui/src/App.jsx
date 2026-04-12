import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Driver from "./pages/Driver";
import DriverDashboard from "./pages/DashbroadDriver";
import DriverRegister from "./pages/DriverRegister";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/driver/register" element={<DriverRegister />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
