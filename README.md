# NeoPark – Smart Parking Management System

NeoPark is a **full-stack smart parking system** that provides real-time parking availability and slot booking using a **modular backend architecture and real-time updates**.

---

## Architecture

NeoPark uses a **modular monolithic architecture** with clear separation of concerns:

* **Routes** – API endpoints
* **Controllers** – Request/response handling
* **Services** – Business logic
* **Models** – Database schemas
* **Middlewares** – Authentication & validation
* **Queues** – Background processing

---

## Key Features

* Real-time parking availability
* Slot-level booking system
* Redis caching for performance
* Async processing using queues
* Live updates via Socket.IO
* JWT-based authentication

---

## Tech Stack

* **Frontend:** React (Vite), Tailwind CSS
* **Backend:** Node.js, Express
* **Database:** MongoDB
* **Infra:** Redis, BullMQ, Socket.IO

---

## Setup

```bash
git clone https://github.com/Anhad2220/neopark-smart-parking-system.git
cd neopark-smart-parking-system
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
neopark/
├── frontend/            # React app
└── backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middlewares/
    │   ├── models/
    │   ├── queues/
    │   ├── routes/
    │   ├── services/
    │   └── utils/
    ├── server.js
    ├── package.json
    └── .env
```

---

## System Flow

1. User requests parking data
2. Backend processes via services
3. MongoDB stores/retrieves data
4. Redis caches frequently accessed data
5. Socket.IO pushes real-time updates

---

## Security

* JWT authentication
* Protected routes
* Secure password handling

---

