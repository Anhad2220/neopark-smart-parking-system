# NeoPark Frontend 🅿️

Smart Parking Management System — React + Tailwind CSS + Socket.io client

---

## Pages Included

| Page | Route (internal) | Description |
|---|---|---|
| Landing Page | `landing` | Hero, features, stats — matches SpotSync design |
| Login | `login` | Auth with split-panel design |
| Register | `register` | Account creation |
| Dashboard | `dashboard` | Map with live parking markers + search filters |
| Slot Layout | `slots` | Grid view of all slots (available/booked/EV/handicap) |
| Booking Confirm | `confirm` | Date/time picker + price summary + processing animation |
| History | `history` | All past/active/upcoming bookings |
| Profile | `profile` | Edit user info, stats |
| Admin Dashboard | `admin` | Lot management table, booking overview, system stats |

---

## Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn

### 1. Install dependencies

```bash
cd neopark-frontend
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env if your backend runs on a different port
```

### 3. Run the dev server

```bash
npm run dev
```

App runs at → **http://localhost:3000**

### 4. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Demo Credentials (mock — no backend needed)

| Role | Email | Password |
|---|---|---|
| User | `demo@neopark.com` | any |
| Admin | `admin@neopark.com` | any |

---

## Connecting to the Backend

All API calls are made through Axios. To connect to your real backend:

1. Edit `src/App.jsx` — replace the `API_BASE` constant:
```js
const API_BASE = "http://localhost:5000/api"; // your API gateway
const SOCKET_URL = "http://localhost:5000";
```

2. Replace mock login in `LoginPage` with:
```js
const res = await axios.post(`${API_BASE}/users/login`, form);
setUser(res.data.user);
localStorage.setItem("token", res.data.token);
```

3. Replace mock data in `Dashboard` with:
```js
const res = await axios.get(`${API_BASE}/parking/lots`);
setLots(res.data);
```

4. Enable Socket.io in `App.jsx` (already stubbed):
```js
socketRef.current = io(SOCKET_URL, {
  auth: { token: localStorage.getItem("token") }
});
socketRef.current.on("slot-update", (data) => setLiveSlots(data));
```

---

## Folder Structure

```
neopark-frontend/
├── src/
│   ├── App.jsx          ← All pages + routing (single-file SPA)
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Tailwind directives + global styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```

---

## Tech Stack

- **React 18** — UI framework
- **Vite** — Dev server & bundler
- **Tailwind CSS** — Utility-first styling
- **Axios** — HTTP client for API calls
- **Socket.io-client** — Real-time slot updates
- **Google Fonts (Sora)** — Typography

---

## API Contracts Expected from Backend

### Auth
```
POST /api/users/register   { name, email, password, vehicleNumber }
POST /api/users/login      { email, password }
GET  /api/users/profile    (Bearer token)
```

### Parking
```
GET  /api/parking/lots           → list all parking lots
GET  /api/parking/lots/:id       → single lot details
GET  /api/parking/lots/:id/slots → all slots with status
```

### Bookings
```
POST /api/bookings          { slotId, parkingId, startTime, duration }
GET  /api/bookings/my       → user's booking history
DELETE /api/bookings/:id    → cancel booking
```

### Socket.io Events
```
Emit:   join-parking   { parkingId }
Listen: slot-update    { parkingId, slots: [{ id, status }] }
Listen: booking-confirmed { bookingId }
```

---

## Team Collaboration Notes

This frontend is a **single-file SPA** for easy collaboration:
- Each page is a separate function component in `App.jsx`
- Team members can split work by extracting components into `src/pages/` or `src/components/`
- Suggested split:
  - Member 1: `LandingPage`, `LoginPage`, `RegisterPage`
  - Member 2: `Dashboard`, `MapPinFull`, `MockMapSVG`
  - Member 3: `SlotLayoutPage`, `BookingConfirmPage`
  - Member 4: `BookingHistoryPage`, `ProfilePage`, `AdminDashboard`
