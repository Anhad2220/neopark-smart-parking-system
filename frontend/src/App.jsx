import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import api from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icons = {
  car: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h8l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2h-2M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z" /></svg>),
  user: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>),
  check: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>),
  x: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>),
  logout: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>),
  lightning: (cls) => (<svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>),
  shield: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>),
  clock: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
  chevronDown: (cls) => (<svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>),
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const availabilityColor = (available, total) => {
  if (!total || available === 0) return "#ef4444";
  const ratio = available / total;
  if (ratio > 0.5) return "#22c55e";
  if (ratio > 0.2) return "#f97316";
  return "#ef4444";
};

// Safely extract array from any backend response shape
// Your backend: { success, message, data: { lots/slots/bookings/users } }
const extractList = (resData, ...keys) => {
  const d = resData?.data ?? resData;
  for (const k of keys) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  if (Array.isArray(d)) return d;
  return [];
};

const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ErrorBanner = ({ msg }) => (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
    {Icons.x("w-4 h-4 flex-shrink-0")} {msg}
  </div>
);

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  if (!user) return null;
  const navLinks = [{ label: "Home", key: "dashboard" }, { label: "Bookings", key: "bookings" }, { label: "Profile", key: "profile" }];
  if (user.role === "admin") navLinks.push({ label: "Admin", key: "admin" });
  return (
    <nav style={{ background: "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)" }} className="shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <button onClick={() => setPage("dashboard")} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">{Icons.car("w-5 h-5 text-blue-700")}</div>
          <span className="text-white font-bold text-xl" style={{ fontFamily: "'Sora', sans-serif" }}>Neo<span className="text-blue-200">Park</span></span>
        </button>
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button key={link.key} onClick={() => setPage(link.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${page === link.key ? "bg-white/20 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"}`}
              style={{ fontFamily: "'Sora', sans-serif" }}>{link.label}</button>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><span className="text-blue-700 font-bold text-sm">{user.name?.[0]?.toUpperCase()}</span></div>
            <span className="text-white text-sm font-medium hidden sm:block">{user.name}</span>
            {Icons.chevronDown("w-4 h-4 text-blue-200")}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              <button onClick={() => { setPage("profile"); setDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2">{Icons.user("w-4 h-4 text-blue-600")} Profile</button>
              <div className="border-t border-gray-100" />
              <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">{Icons.logout("w-4 h-4")} Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── MAP HELPERS ─────────────────────────────────────────────────────────────
function MockMapSVG() {
  return (
    <svg className="w-full h-full" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#e8eaed" />
      <rect x="0" y="90" width="300" height="20" fill="#c8cdd3" />
      <rect x="100" y="0" width="20" height="200" fill="#c8cdd3" />
      <rect x="200" y="0" width="15" height="200" fill="#c8cdd3" />
      <rect x="0" y="0" width="48" height="88" rx="2" fill="#d0d5de" />
      <rect x="125" y="0" width="73" height="88" rx="2" fill="#d0d5de" />
      <rect x="217" y="0" width="83" height="88" rx="2" fill="#d0d5de" />
      <rect x="0" y="113" width="48" height="35" rx="2" fill="#d0d5de" />
      <rect x="217" y="113" width="83" height="35" rx="2" fill="#d0d5de" />
      <rect x="220" y="165" width="80" height="35" rx="4" fill="#93c5fd" opacity="0.6" />
    </svg>
  );
}

function MapPin({ x, y, color, label, slots, isFull }) {
  const [show, setShow] = useState(false);
  return (
    <div className="absolute cursor-pointer" style={{ left: x, top: y, transform: "translate(-50%, -100%)" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill={color} /><circle cx="12" cy="12" r="5" fill="white" /></svg>
      {show && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-2xl p-3 min-w-max border border-gray-100 z-50"><p className="text-sm font-bold text-gray-900">{label}</p><p className={`text-xs mt-0.5 font-medium ${isFull ? "text-red-500" : "text-gray-500"}`}>{slots}</p></div>)}
    </div>
  );
}

function MapPinFull({ lot, x, y, onSelect }) {
  const [hover, setHover] = useState(false);
  const isFull = (lot.available ?? 0) === 0;
  return (
    <div className="absolute cursor-pointer" style={{ left: x, top: y, transform: "translate(-50%, -100%)" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onSelect}>
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))" }}><path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.163 24.837 0 16 0Z" fill={lot.color} /><circle cx="16" cy="16" r="7" fill="white" /></svg>
      {hover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-2xl p-3 min-w-max border border-gray-100 z-50">
          <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{ background: lot.color }} /><span className="text-sm font-bold text-gray-900">{lot.name}</span></div>
          <p className={`text-xs font-semibold ${isFull ? "text-red-500" : "text-gray-500"}`}>{isFull ? "Full" : `${lot.available} Slots Available`}</p>
          <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="mt-2 w-full text-xs font-bold text-white rounded-lg py-1.5 hover:opacity-80" style={{ background: lot.color }}>View Details</button>
        </div>
      )}
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ setPage }) {
  const PREVIEW_LOTS = [
    { id: "1", name: "Near Parkade", available: 12, color: "#22c55e" },
    { id: "2", name: "Main Street Garage", available: 5, color: "#f97316" },
    { id: "3", name: "City Center Lot", available: 0, color: "#ef4444" },
  ];
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
      <nav style={{ background: "linear-gradient(135deg, #1a56db 0%, #1e40af 100%)" }} className="shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">{Icons.car("w-5 h-5 text-blue-700")}</div><span className="text-white font-bold text-xl">Neo<span className="text-blue-200">Park</span></span></div>
          <div className="flex gap-3">
            <button onClick={() => setPage("login")} className="px-5 py-2 text-white text-sm font-medium border border-white/30 rounded-lg hover:bg-white/10 transition-all">Sign In</button>
            <button onClick={() => setPage("register")} className="px-5 py-2 bg-white text-blue-700 text-sm font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all">Get Started</button>
          </div>
        </div>
      </nav>
      <div style={{ background: "linear-gradient(160deg, #1a56db 0%, #1e40af 60%, #1e3a8a 100%)" }} className="relative overflow-hidden pb-32 pt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 mb-6"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-white/90 text-sm font-medium">Real-Time Slot Tracking</span></div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">Smart Parking,<br /><span className="text-blue-200">Zero Hassle.</span></h1>
            <p className="text-blue-100 text-lg mb-10 max-w-lg leading-relaxed">Find, reserve, and manage parking spots in real-time. NeoPark brings intelligence to urban parking.</p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <button onClick={() => setPage("register")} className="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl text-lg hover:shadow-2xl hover:scale-105 transition-all">Find Parking Now</button>
              <button onClick={() => setPage("login")} className="px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-xl text-lg hover:bg-white/10 transition-all">Sign In</button>
            </div>
          </div>
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Live parking availability</div>
              <div className="flex">
                <div className="w-44 border-r border-gray-100 p-3 space-y-3">
                  {PREVIEW_LOTS.map((lot) => (<div key={lot.id} className="p-2 rounded-lg bg-gray-50"><p className="text-xs font-bold text-blue-700">{lot.name}</p><p className="text-xs text-gray-500 mb-1.5">{lot.available > 0 ? `${lot.available} Slots` : "Full"}</p><span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: lot.color }}>{lot.available > 0 ? "Available" : "Full"}</span></div>))}
                </div>
                <div className="flex-1 relative h-52 bg-gray-100 overflow-hidden"><MockMapSVG /><MapPin x="30%" y="55%" color="#f97316" label="Main St" slots="5 slots" /><MapPin x="55%" y="25%" color="#22c55e" label="Near Parkade" slots="12 slots" /><MapPin x="78%" y="42%" color="#ef4444" label="City Center" slots="Full" isFull /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "-4rem" }}><svg viewBox="0 0 1440 80" fill="none"><path d="M0 80L1440 80L1440 20C1200 70 960 0 720 30C480 60 240 10 0 40L0 80Z" fill="white" /></svg></div>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-4">Why NeoPark?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[{ icon: Icons.lightning, color: "bg-yellow-50 text-yellow-600", title: "Real-Time Availability", desc: "Live slot updates using WebSockets." }, { icon: Icons.shield, color: "bg-green-50 text-green-600", title: "Secure Reservations", desc: "Distributed locking prevents double bookings." }, { icon: Icons.clock, color: "bg-blue-50 text-blue-600", title: "Instant Confirmation", desc: "Async queue processes in seconds." }].map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-8 hover:shadow-lg hover:-translate-y-1 transition-all"><div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5`}>{f.icon("w-6 h-6")}</div><h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3><p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p></div>
          ))}
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg, #1a56db, #1e3a8a)" }} className="py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{ val: "500+", label: "Parking Lots" }, { val: "10K+", label: "Daily Users" }, { val: "99.9%", label: "Uptime" }, { val: "<2s", label: "Booking Time" }].map((s, i) => (<div key={i}><div className="text-4xl font-extrabold text-white mb-1">{s.val}</div><div className="text-blue-200 text-sm font-medium">{s.label}</div></div>))}
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Ready to park smarter?</h2>
        <button onClick={() => setPage("register")} className="px-10 py-4 bg-blue-600 text-white font-bold rounded-xl text-lg hover:bg-blue-700 transition-all">Create Free Account</button>
      </div>
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">© 2026 NeoPark · Smart Parking Management System</footer>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ setPage, setUser }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/auth/login", form);
      console.log("LOGIN FULL RESPONSE:", res.data);
      // Handle: { data: { user, token } } OR { user, token } OR { data: { data: { user, token } } }
      const inner = res.data?.data?.user ? res.data.data : res.data?.user ? res.data : null;
      if (!inner?.user || !inner?.token) throw new Error("Unexpected response — check console");
      localStorage.setItem("neopark_user", JSON.stringify(inner.user));
      localStorage.setItem("neopark_token", inner.token);
      setUser(inner.user);
    } catch (err) {
      console.error("LOGIN ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #1a56db, #1e3a8a)" }} className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-xl">{Icons.car("w-9 h-9 text-blue-700")}</div>
        <h2 className="text-4xl font-extrabold text-white text-center mb-4">Welcome Back!</h2>
        <p className="text-blue-200 text-center text-lg max-w-sm">Your smart parking experience awaits.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-500 mb-8">New to NeoPark? <button onClick={() => setPage("register")} className="text-blue-600 font-semibold hover:underline">Create account</button></p>
          {error && <ErrorBanner msg={error} />}
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white" required /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white" required /></div>
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="w-full py-3.5 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-gray-400">Demo: <strong>admin@neopark.com</strong> / admin123</p>
          <button onClick={() => setPage("landing")} className="mt-4 text-gray-400 text-sm hover:text-gray-600">← Back to home</button>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
function RegisterPage({ setPage, setUser }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", vehicleNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await api.post("/auth/register", form);
      console.log("REGISTER RESPONSE:", res.data);
      const inner = res.data?.data?.user ? res.data.data : res.data?.user ? res.data : null;
      if (!inner?.user || !inner?.token) throw new Error("Unexpected response");
      localStorage.setItem("neopark_token", inner.token);
      localStorage.setItem("neopark_user", JSON.stringify(inner.user));
      setUser(inner.user);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8"><div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">{Icons.car("w-5 h-5 text-white")}</div><span className="text-gray-900 font-bold text-xl">Neo<span className="text-blue-600">Park</span></span></div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Already have one? <button onClick={() => setPage("login")} className="text-blue-600 font-semibold hover:underline">Sign in</button></p>
        {error && <ErrorBanner msg={error} />}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {[{ label: "Full Name", key: "name", type: "text", placeholder: "John Doe" }, { label: "Email Address", key: "email", type: "email", placeholder: "you@example.com" }, { label: "Password", key: "password", type: "password", placeholder: "Min. 6 characters" }, { label: "Vehicle Number", key: "vehicleNumber", type: "text", placeholder: "TN 01 AB 1234" }].map((f) => (
              <div key={f.key}><label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label><input type={f.type} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" required={f.key !== "vehicleNumber"} /></div>
            ))}
            <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="w-full py-3.5 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
        <button onClick={() => setPage("landing")} className="mt-6 text-gray-400 text-sm hover:text-gray-600">← Back to home</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ setPage, setSelectedParking, liveSlots }) {
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePin, setActivePin] = useState(null);

  const fetchParkings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/parking");
      console.log("PARKING RESPONSE:", JSON.stringify(res.data, null, 2));
      // Your backend: { success, data: { lots: [...] } }
      const lots = extractList(res.data, "lots", "parkings", "data");
      console.log("EXTRACTED LOTS:", lots);
      setParkings(lots);
    } catch (err) {
      console.error("PARKING ERROR:", err.response?.status, err.response?.data || err.message);
      setError("Failed to load parking locations.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParkings(); }, [fetchParkings]);

  useEffect(() => {
    if (!liveSlots) return;
    setParkings((prev) => prev.map((p) => {
      const update = liveSlots[p._id];
      return update !== undefined ? { ...p, availableSlots: update } : p;
    }));
  }, [liveSlots]);

  const handleViewDetails = (parking) => {
    if (!parking?._id) { console.error("No _id on parking:", parking); return; }
    setSelectedParking(parking);
    setPage("slots");
  };

  const avail = (p) => p.availableSlots ?? p.availableSpots ?? 0;
  const tot = (p) => p.totalSlots ?? p.capacity ?? 0;
  const getStatusStyle = (p) => {
    const av = avail(p), t = tot(p);
    if (av === 0) return { color: "#ef4444", label: "Full" };
    if (t > 0 && av / t <= 0.2) return { color: "#f97316", label: `${av} Available` };
    return { color: "#22c55e", label: `${av} Available` };
  };

  const PIN_POSITIONS = [{ x: "25%", y: "56%" }, { x: "57%", y: "22%" }, { x: "82%", y: "41%" }, { x: "40%", y: "70%" }, { x: "68%", y: "58%" }, { x: "15%", y: "35%" }];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Find a Parking Spot</h1>
        {error && <ErrorBanner msg={error} />}
        {loading ? <Spinner /> : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-64 border-r border-gray-100">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between"><h3 className="font-bold text-gray-700 text-sm">Nearby Lots</h3><span className="text-xs text-gray-400">{parkings.length} locations</span></div>
                <div className="divide-y divide-gray-50">
                  {parkings.length === 0 && <p className="p-4 text-sm text-gray-400">No parking lots found.</p>}
                  {parkings.map((p) => {
                    const s = getStatusStyle(p);
                    return (
                      <div key={p._id} className={`p-4 cursor-pointer transition-all hover:bg-blue-50 ${activePin === p._id ? "bg-blue-50" : ""}`} onClick={() => setActivePin(activePin === p._id ? null : p._id)}>
                        <p className="font-bold text-blue-700 text-sm mb-0.5">{p.name}</p>
                        <p className="text-xs mb-1" style={{ color: s.color }}>{s.label}</p>
                        <p className="text-xs text-gray-400 mb-2">₹{p.pricePerHour}/hr</p>
                        <button onClick={(e) => { e.stopPropagation(); handleViewDetails(p); }} disabled={avail(p) === 0} className="text-xs px-3 py-1.5 rounded-lg font-bold text-white transition-all hover:opacity-80 disabled:opacity-40" style={{ background: s.color }}>
                          {avail(p) === 0 ? "Full" : "View Details"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 relative" style={{ minHeight: "420px" }}>
                <div className="absolute inset-0 bg-gray-100 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="420" fill="#e8eaed" />
                    <rect x="0" y="180" width="600" height="30" fill="#c8cdd3" /><rect x="0" y="320" width="600" height="25" fill="#c8cdd3" /><rect x="150" y="0" width="25" height="420" fill="#c8cdd3" /><rect x="350" y="0" width="20" height="420" fill="#c8cdd3" /><rect x="500" y="0" width="18" height="420" fill="#c8cdd3" />
                    <rect x="0" y="0" width="58" height="178" rx="3" fill="#d0d5de" /><rect x="80" y="0" width="68" height="178" rx="3" fill="#d0d5de" /><rect x="178" y="0" width="168" height="178" rx="3" fill="#d0d5de" /><rect x="373" y="0" width="123" height="178" rx="3" fill="#d0d5de" />
                    <rect x="0" y="213" width="58" height="103" rx="3" fill="#d0d5de" /><rect x="80" y="213" width="68" height="103" rx="3" fill="#d0d5de" /><rect x="178" y="213" width="168" height="103" rx="3" fill="#d0d5de" /><rect x="373" y="213" width="123" height="103" rx="3" fill="#d0d5de" />
                    {[100, 200, 300, 420].map((x, i) => <circle key={i} cx={x} cy={360} r="12" fill="#86efac" opacity="0.7" />)}
                    <rect x="373" y="347" width="227" height="73" rx="6" fill="#93c5fd" opacity="0.5" />
                  </svg>
                  {parkings.map((p, i) => {
                    const pos = PIN_POSITIONS[i % PIN_POSITIONS.length];
                    const color = availabilityColor(avail(p), tot(p));
                    return <MapPinFull key={p._id} lot={{ ...p, available: avail(p), color }} x={pos.x} y={pos.y} onSelect={() => handleViewDetails(p)} />;
                  })}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs font-semibold text-gray-700">Live Updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SLOT LAYOUT PAGE ─────────────────────────────────────────────────────────
function SlotLayoutPage({ selectedParking, setPage, setBookingSlot }) {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedParking?._id) return;
    const fetchSlots = async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get(`/parking/${selectedParking._id}/slots`);
        console.log("SLOTS RESPONSE:", JSON.stringify(res.data, null, 2));
        const list = extractList(res.data, "slots", "data");
        setSlots(list);
      } catch (err) {
        console.error("SLOTS ERROR:", err.response?.status, err.response?.data || err.message);
        setError("Failed to load slot data.");
      } finally { setLoading(false); }
    };
    fetchSlots();
  }, [selectedParking]);

  if (!selectedParking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="text-center"><p className="text-gray-500 mb-4">No parking lot selected.</p><button onClick={() => setPage("dashboard")} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold">Back to Map</button></div>
    </div>
  );

  const filteredSlots = filter === "all" ? slots : slots.filter((s) => s.status === filter || s.type === filter);

  const slotColor = (slot) => {
    if (slot._id === selectedSlot?._id) return { bg: "#dbeafe", border: "#1a56db", text: "#1a56db" };
    if (slot.status === "occupied" || slot.status === "booked") return { bg: "#fef2f2", border: "#fca5a5", text: "#ef4444" };
    if (slot.status === "reserved") return { bg: "#fff7ed", border: "#fdba74", text: "#f97316" };
    if (slot.status === "maintenance") return { bg: "#f3f4f6", border: "#d1d5db", text: "#9ca3af" };
    if (slot.type === "handicapped" || slot.type === "handicap") return { bg: "#eff6ff", border: "#93c5fd", text: "#3b82f6" };
    if (slot.type === "ev") return { bg: "#f0fdf4", border: "#86efac", text: "#22c55e" };
    return { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" };
  };

  const isSelectable = (s) => s.status === "available";
  const handleBook = () => { if (!selectedSlot) return; setBookingSlot(selectedSlot); setPage("confirm"); };
  const availableCount = slots.filter((s) => s.status === "available").length;
  const occupiedCount = slots.filter((s) => s.status === "occupied" || s.status === "booked").length;
  const reservedCount = slots.filter((s) => s.status === "reserved").length;

  return (
    <div className="min-h-screen bg-gray-50 p-4" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setPage("dashboard")} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <div><h1 className="text-2xl font-extrabold text-gray-900">{selectedParking.name}</h1><p className="text-gray-500 text-sm">₹{selectedParking.pricePerHour}/hr</p></div>
          <div className="ml-auto flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-semibold text-green-700">Live</span></div>
        </div>
        {error && <ErrorBanner msg={error} />}
        {loading ? <Spinner /> : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[{ label: "Available", val: availableCount, color: "#22c55e" }, { label: "Occupied", val: occupiedCount, color: "#ef4444" }].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} /><div><div className="text-xl font-extrabold text-gray-900">{s.val}</div><div className="text-xs text-gray-500">{s.label}</div></div></div>
              ))}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {["all", "available", "ev", "handicapped"].map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${filter === f ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}>{f === "all" ? "All Slots" : f === "ev" ? "" : f === "handicapped" ? "" : "Available Only"}</button>))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6"><div className="h-px flex-1 bg-gray-200" /><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entrance</span><div className="h-px flex-1 bg-gray-200" /></div>
              {filteredSlots.length === 0 ? <p className="text-center text-gray-400 py-8">No slots match this filter.</p> : (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {filteredSlots.map((slot) => {
                    const c = slotColor(slot);
                    const selectable = isSelectable(slot);
                    return (
                      <button key={slot._id} onClick={() => selectable && setSelectedSlot(selectedSlot?._id === slot._id ? null : slot)} disabled={!selectable}
                        className="aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all border-2 hover:scale-105"
                        style={{ background: c.bg, borderColor: c.border, color: c.text, cursor: selectable ? "pointer" : "not-allowed" }}
                        title={`${slot.slotNumber} — ${slot.status} — ${slot.type}`}>
                        <span className="text-xs">{slot.type === "handicapped" || slot.type === "handicap" ? "♿" : slot.type === "ev" ? "⚡" : ""}</span>
                        <span>{slot.slotNumber}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedSlot && (
              <div className="mt-6 bg-white rounded-2xl border border-blue-100 p-5 flex items-center justify-between shadow-lg">
                <div><p className="font-bold text-gray-900">Selected: <span className="text-blue-600">{selectedSlot.slotNumber}</span></p><p className="text-sm text-gray-500 capitalize">{selectedSlot.type}</p></div>
                <button onClick={handleBook} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 hover:shadow-lg transition-all">Reserve Slot →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── BOOKING CONFIRMATION ──────────────────────────────────────────────────────
function BookingConfirmPage({ selectedParking, bookingSlot, setPage }) {
  const [step, setStep] = useState("form");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    vehicleNumber: "", 
    startTime: "", 
    endTime: "" 
  });

  // Auto-fill vehicle number from profile/local storage
  useEffect(() => {
    const stored = localStorage.getItem("neopark_user");
    if (stored) { 
      try { 
        const u = JSON.parse(stored); 
        if (u.vehicleNumber) setForm((f) => ({ ...f, vehicleNumber: u.vehicleNumber })); 
      } catch (err) {
        console.error("Error parsing user for auto-fill:", err);
      } 
    }
  }, []);

  // Guard clause if user navigates here without selection
  if (!selectedParking || !bookingSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => setPage("dashboard")} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const calcDuration = () => {
    if (!form.startTime || !form.endTime) return null;
    const diff = new Date(form.endTime) - new Date(form.startTime);
    return diff > 0 ? (diff / (1000 * 60 * 60)).toFixed(1) : null;
  };

  const calcTotal = () => { 
    const hrs = parseFloat(calcDuration()); 
    return hrs > 0 ? (hrs * selectedParking.pricePerHour).toFixed(0) : null; 
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    const duration = calcDuration();
    if (!duration || parseFloat(duration) <= 0) { 
      setError("End time must be after start time."); 
      return; 
    }
    
    setError(""); 
    setStep("processing");

    try {
      const res = await api.post("/bookings", {
        slotId: bookingSlot._id, 
        parkingId: selectedParking._id, 
        vehicleNumber: form.vehicleNumber,
        startTime: new Date(form.startTime).toISOString(), 
        endTime: new Date(form.endTime).toISOString(),
      });
      
      const bookingData = res.data?.data || res.data;
      setConfirmedBooking(bookingData);
      setStep("success");
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Booking failed.");
      setStep("form");
      window.scrollTo(0, 0);
    }
  };

  const duration = calcDuration();
  const total = calcTotal();
  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="w-full max-w-lg">
        
        {/* STEP: PROCESSING */}
        {step === "processing" && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Booking...</h2>
            <p className="text-gray-500 text-sm">Acquiring slot lock and confirming reservation</p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === "success" && confirmedBooking && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              {Icons.check("w-10 h-10 text-green-600")}
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-500 mb-6">Your reservation is confirmed.</p>
            
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Parking</span>
                <span className="font-semibold text-gray-900">{selectedParking.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Slot</span>
                <span className="font-bold text-blue-600">
                  {confirmedBooking.slotId?.slotNumber || bookingSlot.slotNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono text-xs text-gray-600">
                  {String(confirmedBooking?._id || "").slice(-8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-blue-700">₹{confirmedBooking.amount || total}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPage("bookings")} className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                View History
              </button>
              <button onClick={() => setPage("dashboard")} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="flex-1 py-3 text-white font-bold rounded-xl hover:opacity-90 shadow-md">
                Back to Map
              </button>
            </div>
          </div>
        )}

        {/* STEP: FORM */}
        {step === "form" && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="p-6">
              <h1 className="text-xl font-extrabold text-white mb-1">Confirm Reservation</h1>
              <p className="text-blue-100 text-sm">{selectedParking.name} · Slot {bookingSlot.slotNumber}</p>
            </div>

            <form onSubmit={handleConfirm} className="p-6 space-y-5">
              {error && <ErrorBanner msg={error} />}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vehicle Number</label>
                <input 
                  type="text" 
                  value={form.vehicleNumber} 
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. TN 01 AB 1234" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all" 
                  required 
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={form.startTime} 
                    min={minDateTime} 
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm" 
                    required 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                  <input 
                    type="datetime-local" 
                    value={form.endTime} 
                    min={form.startTime || minDateTime} 
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm" 
                    required 
                  />
                </div>
              </div>

              {duration && total && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2 border border-blue-100">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Rate</span><span className="font-semibold text-gray-900">₹{selectedParking.pricePerHour}/hr</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Duration</span><span className="font-semibold text-gray-900">{duration} hours</span></div>
                  <div className="border-t border-blue-200 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total Estimate</span>
                    <span className="font-extrabold text-blue-700 text-lg">₹{total}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPage("slots")} className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                  Back
                </button>
                <button 
                  type="submit" 
                  style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} 
                  className="flex-1 py-3.5 text-white font-bold rounded-xl hover:opacity-90 hover:shadow-lg transition-all"
                >
                  {total ? `Confirm — ₹${total}` : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BOOKING HISTORY (CLEANED) ──────────────────────────────────────────────────────────
function BookingHistoryPage({ setPage }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [cancelling, setCancelling] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeFilter !== "all" ? { status: activeFilter } : {};
      const res = await api.get("/bookings/my", { params });
      
      // We use your helper to extract the list
      const list = extractList(res.data, "bookings", "data");
      setBookings(list);
    } catch (err) {
      console.error("BOOKINGS ERROR:", err.response?.data || err.message);
      setError("Failed to load bookings.");
    } finally { setLoading(false); }
  }, [activeFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(bookingId);
    try {
      // Logic for cancellation
      await api.put(`/bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (err) { 
      setError(err.response?.data?.message || "Failed to cancel."); 
    } finally { setCancelling(null); }
  };

  const statusStyle = { 
    completed: { bg: "#f0fdf4", text: "#16a34a", label: "Completed" }, 
    active: { bg: "#eff6ff", text: "#1d4ed8", label: "Active" }, 
    cancelled: { bg: "#fef2f2", text: "#dc2626", label: "Cancelled" }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Bookings</h1>
        
        {/* UPDATED: Only show valid filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "active", "completed", "cancelled"].map((f) => (
            <button 
              key={f} 
              onClick={() => setActiveFilter(f)} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${
                activeFilter === f ? "bg-blue-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {error && <ErrorBanner msg={error} />}
        
        {loading ? <Spinner /> : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="text-5xl mb-4">🅿️</div>
            <p className="text-gray-500 mb-4">No bookings found in this category.</p>
            <button onClick={() => setPage("dashboard")} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm">Find Parking</button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const s = statusStyle[b.status] || { bg: "#f3f4f6", text: "#6b7280", label: b.status };
              return (
                <div key={b._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {Icons.car("w-6 h-6 text-blue-600")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {/* 👇 ADD THIS SPAN HERE */}
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md uppercase">
                            Slot {b.slotId?.slotNumber || "N/A"}
                          </span>
                          <span className="font-mono text-xs text-gray-400">#{String(b._id).slice(-8).toUpperCase()}</span>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.text }}>
                            {s.label}
                          </span>
                        </div>
                        {/* UPDATED: Fallback for vehicle number */}
                        <p className="font-bold text-gray-900 text-sm">
                          Vehicle: {b.vehicleNumber || "Not Provided"}
                        </p>
                        {b.startTime && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(b.startTime).toLocaleString()} — {new Date(b.endTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Amount typically comes back as b.amount from your schema */}
                      <p className="font-bold text-gray-900 text-lg">₹{b.amount || 0}</p>
                    </div>
                  </div>
                  
                  {/* Cancel button only for Active bookings */}
                  {b.status === "active" && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => handleCancel(b._id)} 
                        disabled={cancelling === b._id} 
                        className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50"
                      >
                        {cancelling === b._id ? "Cancelling..." : "Cancel Booking"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ user, setUser }) {
  const [form, setForm] = useState({ name: user?.name || "", vehicleNumber: user?.vehicleNumber || "", phoneNumber: user?.phoneNumber || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await api.get("/bookings/my");
      // Use the key 'data' or 'bookings' based on your controller
      const list = res.data.bookings || res.data.data || [];

      if (Array.isArray(list)) {
        // Use 'amount' because that's what we named it in the createBooking service
        const spent = list.reduce((s, b) => s + (Number(b.amount) || 0), 0);
        const active = list.filter((b) => b.status === "active").length;
        
        setStats({ total: list.length, active, spent });
      } else {
        setStats({ total: 0, active: 0, spent: 0 });
      }
    } catch (err) {
      console.error("Stats Error:", err);
      setStats({ total: 0, active: 0, spent: 0 });
    }
  };
  fetchStats();
}, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        vehicleNumber: user.vehicleNumber || "",
        phoneNumber: user.phoneNumber || ""
      });
    }
  }, [user]); // Re-runs when the 'user' prop updates from the parent

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      // Try common profile update routes
      let res;
      try { res = await api.put("/auth/profile", form); }
      catch { try { res = await api.put("/users/profile", form); } catch { res = await api.patch("/auth/me", form); } }
      console.log("PROFILE SAVE RESPONSE:", res.data);
      const updated = res.data?.data?.user || res.data?.user || res.data?.data || {};
      const merged = { ...user, ...updated };
      localStorage.setItem("neopark_user", JSON.stringify(merged));
      setUser(merged);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to save profile.");
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("Passwords do not match."); return; }
    if (pwForm.newPassword.length < 6) { setPwError("Min 6 characters."); return; }
    setPwSaving(true); setPwError("");
    try {
      try { await api.put("/auth/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }); }
      catch { await api.put("/auth/password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }); }
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      alert("Password changed successfully!");
    } catch (err) { setPwError(err.response?.data?.message || err.response?.data?.error || "Incorrect current password."); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Profile</h1>
        <div style={{ background: "linear-gradient(135deg, #1a56db, #1e3a8a)" }} className="rounded-2xl p-6 mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-lg"><span className="text-blue-700 font-extrabold text-3xl">{user?.name?.[0]?.toUpperCase()}</span></div>
          <div><h2 className="text-xl font-extrabold text-white">{user?.name}</h2><p className="text-blue-200 text-sm">{user?.email}</p><span className="inline-block mt-2 px-3 py-0.5 bg-white/20 rounded-full text-white text-xs font-semibold capitalize">{user?.role}</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Personal Information</h3>
          {error && <ErrorBanner msg={error} />}
          <form onSubmit={handleSave} className="space-y-4">
            {[{ label: "Full Name", key: "name" }, { label: "Vehicle Number", key: "vehicleNumber", placeholder: "TN 01 AB 1234" }, { label: "Phone Number", key: "phoneNumber", placeholder: "+91 98765 43210" }].map((f) => (
              <div key={f.key}><label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label><input type="text" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all" /></div>
            ))}
            <button type="submit" disabled={saving} style={saved ? { background: "#16a34a" } : { background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="w-full py-3.5 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {saved ? <>{Icons.check("w-4 h-4")} Saved!</> : saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Change Password</h3>
          {pwError && <ErrorBanner msg={pwError} />}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[{ label: "Current Password", key: "currentPassword" }, { label: "New Password", key: "newPassword" }, { label: "Confirm New Password", key: "confirmPassword" }].map((f) => (
              <div key={f.key}><label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label><input type="password" value={pwForm[f.key]} onChange={(e) => setPwForm({ ...pwForm, [f.key]: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm" required /></div>
            ))}
            <button type="submit" disabled={pwSaving} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="w-full py-3.5 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60">{pwSaving ? "Updating..." : "Change Password"}</button>
          </form>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{ val: stats?.total ?? "—", label: "Total Bookings" }, { val: stats?.active ?? "—", label: "Active Now" }, { val: stats ? `₹${stats.spent}` : "—", label: "Total Spent" }].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center"><div className="text-2xl font-extrabold text-blue-600">{s.val}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD (WITH UPDATE FEATURE) ──────────────────────────────────
function AdminDashboard() {
  const [parkings, setParkings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [addForm, setAddForm] = useState({ name: "", lat: "", lng: "", totalSlots: "20", pricePerHour: "30", amenities: "" });
  const [adding, setAdding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.allSettled([
        api.get("/parking"), 
        api.get("/bookings")
      ]);

      if (pRes.status === "fulfilled") {
        const pData = pRes.value.data;
        const pList = pData.lots || pData.data?.lots || (Array.isArray(pData.data) ? pData.data : []);
        setParkings(pList);
      }

      if (bRes.status === "fulfilled") {
        const bData = bRes.value.data;
        const bList = bData.bookings || bData.data?.bookings || (Array.isArray(bData.data) ? bData.data : []);
        setBookings(Array.isArray(bList) ? bList : []);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const startEdit = (p) => {
    setEditingId(p._id);
    setAddForm({
      name: p.name || "",
      // Use optional chaining and fallbacks for coordinates
      lat: p.location?.coordinates?.[1] ?? "", 
      lng: p.location?.coordinates?.[0] ?? "",
      totalSlots: (p.totalSlots || 0).toString(),
      pricePerHour: (p.pricePerHour || 0).toString(),
      // 👇 FIX: Fallback to empty array before calling join
      amenities: (p.amenities || []).join(", ") 
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveParking = async (e) => {
    e.preventDefault(); 
    setAdding(true);
    setError(""); // Clear error at start

    const lng = parseFloat(addForm.lng);
    const lat = parseFloat(addForm.lat);

    // FIX: More robust validation
    if (isNaN(lng) || isNaN(lat)) {
      setError("Please enter valid numerical coordinates.");
      setAdding(false);
      return;
    }

    const payload = { 
      name: addForm.name, 
      location: { type: "Point", coordinates: [lng, lat] }, 
      totalSlots: parseInt(addForm.totalSlots), 
      pricePerHour: parseInt(addForm.pricePerHour), 
      amenities: typeof addForm.amenities === 'string' 
        ? addForm.amenities.split(",").map((a) => a.trim()).filter(Boolean)
        : addForm.amenities 
    };

    try {
      if (editingId) {
        await api.put(`/parking/${editingId}`, payload);
      } else {
        await api.post("/parking", payload);
      }

      setShowAddForm(false);
      setEditingId(null); 
      setAddForm({ name: "", lat: "", lng: "", totalSlots: "20", pricePerHour: "30", amenities: "" });
      loadAll();
    } catch (err) { 
      setError(err.response?.data?.message || "Failed to save parking."); 
    } finally { 
      setAdding(false); 
    }
  };

  const handleDeleteParking = async (id) => {
    if (!window.confirm("Delete this parking lot? This cannot be undone.")) return;
    try {
      await api.delete(`/parking/${id}`);
      loadAll();
    } catch (err) { setError("Failed to delete parking lot."); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1></div>
        </div>

        {error && <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">✕</button>
        </div>}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">{editingId ? "Edit Parking Lot" : "Parking Lots"}</h2>
            <button onClick={() => { setShowAddForm(!showAddForm); if(showAddForm) setEditingId(null); }} style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} className="px-4 py-2 text-white text-xs font-bold rounded-xl">
              {showAddForm ? "✕ Cancel" : "+ Add Lot"}
            </button>
          </div>

          {showAddForm && (
            <div className="p-5 border-b border-gray-100 bg-blue-50">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  {editingId ? "Editing Parking Lot" : "➕ Add New Parking Lot"}
                </h2>
              </div>
              
              <form onSubmit={handleSaveParking} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "name", label: "Name", placeholder: "City Mall Parking" },
                  { key: "lat", label: "Latitude", placeholder: "19.0760" },
                  { key: "lng", label: "Longitude", placeholder: "72.8777" },
                  { key: "totalSlots", label: "Total Slots", placeholder: "50" },
                  { key: "pricePerHour", label: "₹/hour", placeholder: "30" },
                  { key: "amenities", label: "Amenities (comma-sep)", placeholder: "CCTV, EV, Valet" }
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input 
                      type="text" 
                      value={addForm[f.key]} 
                      onChange={(e) => setAddForm({ ...addForm, [f.key]: e.target.value })} 
                      placeholder={f.placeholder} 
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" 
                      required={["name", "totalSlots", "pricePerHour"].includes(f.key)} 
                    />
                  </div>
                ))}
                <div className="col-span-2 md:col-span-3 mt-2 flex gap-2">
                  <button 
                    type="submit" 
                    disabled={adding} 
                    style={{ background: "linear-gradient(135deg, #1a56db, #1e40af)" }} 
                    className="px-6 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-60 shadow-md transition-all"
                  >
                    {adding ? "Saving..." : editingId ? "Update Lot" : "Create Lot"}
                  </button>
                  
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setAddForm({ name: "", lat: "", lng: "", totalSlots: "20", pricePerHour: "30", amenities: "" });
                        setShowAddForm(false);
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* PARKING TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">{["Name", "Total", "Available", "Price", "Actions"].map((h) => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {parkings.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-5 py-3.5">{p.totalSlots}</td>
                    <td className="px-5 py-3.5 font-bold text-blue-600">{p.availableSlots ?? 0}</td>
                    <td className="px-5 py-3.5">₹{p.pricePerHour}</td>
                    <td className="px-5 py-3.5 flex gap-3">
                      <button onClick={() => startEdit(p)} className="text-blue-600 font-bold text-xs">Edit</button>
                      <button onClick={() => handleDeleteParking(p._id)} className="text-red-500 font-bold text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOOKINGS HISTORY TABLE */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100"><h2 className="font-bold text-gray-900">Recent Bookings</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">{["ID", "Vehicle", "Amount", "Status", "Date"].map((h) => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b._id}>
                    <td className="px-5 py-3.5 font-mono text-xs">#{String(b._id).slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-3.5">{b.vehicleNumber}</td>
                    <td className="px-5 py-3.5 font-bold">₹{b.amount}</td>
                    <td className="px-5 py-3.5"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${b.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{b.status}</span></td>
                    <td className="px-5 py-3.5 text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [liveSlots, setLiveSlots] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("neopark_user");
      const storedToken = localStorage.getItem("neopark_token");
      if (storedUser && storedToken) { setUser(JSON.parse(storedUser)); setPage("dashboard"); }
    } catch { localStorage.clear(); }
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("neopark_token");
    socketRef.current = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"], reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 5 });
    socketRef.current.on("connect", () => console.log("🔌 Socket connected:", socketRef.current.id));
    const handleSlotUpdate = ({ parkingId, slotId, status }) => {
      setLiveSlots((prev) => ({ ...prev, [parkingId]: { ...(prev?.[parkingId] || {}), [slotId]: status } }));
    };
    socketRef.current.on("slotUpdate", handleSlotUpdate);
    socketRef.current.on("slot:updated", handleSlotUpdate);
    socketRef.current.on("slot-update", handleSlotUpdate);
    socketRef.current.on("disconnect", () => console.log("🔌 Socket disconnected"));
    return () => { socketRef.current?.disconnect(); };
  }, [user]);

  useEffect(() => {
    if (page === "slots" && selectedParking && socketRef.current?.connected) {
      socketRef.current.emit("join:parking", selectedParking._id);
      socketRef.current.emit("joinParkingRoom", selectedParking._id);
    }
    return () => { if (selectedParking && socketRef.current?.connected) socketRef.current.emit("leave:parking", selectedParking._id); };
  }, [page, selectedParking]);

  useEffect(() => { if (user && (page === "login" || page === "register")) setPage("dashboard"); }, [user]);

  const handleLogout = () => {
    socketRef.current?.disconnect();
    localStorage.removeItem("neopark_token");
    localStorage.removeItem("neopark_user");
    setUser(null); setPage("landing");
  };

  const renderPage = () => {
    switch (page) {
      case "landing":   return <LandingPage setPage={setPage} />;
      case "login":     return <LoginPage setPage={setPage} setUser={setUser} />;
      case "register":  return <RegisterPage setPage={setPage} setUser={setUser} />;
      case "dashboard": return <Dashboard setPage={setPage} setSelectedParking={setSelectedParking} liveSlots={liveSlots} />;
      case "slots":     return <SlotLayoutPage selectedParking={selectedParking} setPage={setPage} setBookingSlot={setBookingSlot} />;
      case "confirm":   return <BookingConfirmPage selectedParking={selectedParking} bookingSlot={bookingSlot} setPage={setPage} />;
      case "bookings":  return <BookingHistoryPage setPage={setPage} />;
      case "history":   return <BookingHistoryPage setPage={setPage} />;
      case "profile":   return <ProfilePage user={user} setUser={setUser} />;
      case "admin":     return user?.role === "admin" ? <AdminDashboard /> : <Dashboard setPage={setPage} setSelectedParking={setSelectedParking} liveSlots={liveSlots} />;
      default:          return <LandingPage setPage={setPage} />;
    }
  };

  const noNavPages = ["landing", "login", "register"];
  return (
    <div className="font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {!noNavPages.includes(page) && <Navbar page={page} setPage={setPage} user={user} onLogout={handleLogout} />}
      {renderPage()}
    </div>
  );
}
