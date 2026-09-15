# ⚙️ Serendib Green Store — Backend API Server

Express & Node.js backend for the **Serendib Green Store** platform. Handles product catalog queries, stock reservations with TTL, idempotent checkout processing, payment simulations, and order management with automatic inventory restocking.

For the full-stack architecture and interactive diagrams, see the [Root README](../README.md).

---

## 🛠️ Tech Stack & Dependencies

- **Node.js**: v18+
- **Express 4.21**: REST API routing & middleware
- **pg (node-postgres)**: PostgreSQL database client
- **cors & dotenv**: Cross-origin requests & environment management

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Optional)* Adjust database credentials in `.env`. If no PostgreSQL instance is found, the server automatically boots with the in-memory fallback.

### 3. Run Development Server
```bash
npm run dev
```
Runs `node --watch server.js` on port `5000`.

### 4. Run Automated Integration Test Suite
```bash
npm test
```
Executes the comprehensive 8-step integration test suite (`test-flow.js`).

---

## 📁 Directory Overview

```text
backend/
├── server.js              # Server bootstrapper, middleware & route mounting
├── test-flow.js           # 8-step end-to-end integration tests
└── src/
    ├── data/
    │   └── initialProducts.js # Seed product catalog with prices in LKR
    ├── db/
    │   ├── db.js          # PostgreSQL pool connection & fallback store
    │   └── schema.sql     # Database schema, indexes, and tables
    ├── routes/
    │   ├── checkoutRoutes.js # /api/checkout/reserve & release endpoints
    │   ├── orderRoutes.js    # /api/orders placement, history & refunds
    │   └── productRoutes.js  # /api/products search and filtering
    └── services/
        ├── inventoryService.js # Reservation lock TTL logic & warehouse tracking
        ├── orderService.js     # Idempotency and order status management
        └── paymentService.js   # Multi-outcome payment simulator
```

---

## 🧪 Key Test Scenarios Covered by `npm test`

1. Catalog search and category filtering.
2. Temporary stock lock (available stock decrements, reserved stock increments).
3. Out-of-stock rejection protection.
4. Payment decline simulation (`402 DECLINED`).
5. Payment timeout simulation (`504 GATEWAY_TIMEOUT`).
6. Payment success & warehouse stock commit (`ORD-XXXX`).
7. Idempotency duplicate replay (same response, zero double-orders).
8. Order cancellation & automatic inventory restocking (`REF-XXXX`).
