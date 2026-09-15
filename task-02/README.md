# 🌿 Serendib Green Store — Full-Stack E-Commerce & Inventory Simulation Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg)](https://www.postgresql.org/)

A production-grade, full-stack e-commerce web application featuring a curated catalog of premium, organic Sri Lankan sustainable products. Built to simulate mission-critical enterprise commerce patterns, including **two-phase inventory reservation holds**, **idempotent payment submission**, **multi-scenario payment gateway simulation**, and **automated restocking on cancellation**.

---

## 📑 Table of Contents

- [Key Architecture & Features](#-key-architecture--features)
- [System Architecture & Flow](#-system-architecture--flow)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Architecture](#-database-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Running Integration Tests](#-running-integration-tests)
- [REST API Reference](#-rest-api-reference)
- [Payment Gateway Simulation Guide](#-payment-gateway-simulation-guide)
- [License](#-license)

---

## 🌟 Key Architecture & Features

### 1. ⏱️ Two-Phase Stock Reservation with TTL (10-Minute Hold)

- Prevents flash-sale race conditions and cart overselling.
- When an order checkout initiates, items are reserved (`reservedStock` increments, `availableStock` decrements).
- A 10-minute hold window with a live countdown timer is displayed to the customer.
- If unfulfilled or abandoned, reservations automatically expire or can be released back to the general inventory pool.

### 2. 🛡️ Idempotent Checkout & Duplicate Protection

- Prevents accidental double-charging caused by network retries, user re-clicks, or connection hiccups.
- Each checkout transaction generates a unique UUID-based `idempotencyKey`.
- Cached in database (`idempotency_records` table). Subsequent requests with the same key safely return the previously created order without re-billing or double-decrementing stock.

### 3. 💳 Multi-Outcome Payment Gateway Simulation

- Embedded mock payment gateway supporting 3 selectable outcomes:
  - **Success (`SUCCESS`)**: Completes authorization, captures payment, commits reserved stock, and generates order confirmation.
  - **Card Declined (`FAILURE`)**: Simulates insufficient funds or invalid credentials with descriptive error alerts.
  - **Gateway Timeout (`TIMEOUT`)**: Simulates network timeouts (504 Gateway Timeout) allowing testing of network failure resilience.

### 4. 🔄 Order Lifecycle & Automated Restock Refunds

- View full customer order history with breakdown of items, payment method, date, and status (`PAID` or `REFUNDED`).
- Cancellation with instant mock refund immediately returns products to active warehouse stock (`totalStock` and `availableStock` restored).

### 5. ⚡ Dual-Mode Database Persistence (Zero-Config Fallback)

- **Primary**: Full relational schema on PostgreSQL with foreign keys, indexes, cascades, and JSONB fields.
- **Zero-Setup In-Memory Fallback**: If PostgreSQL is not configured or unavailable, the backend automatically falls back to an internal in-memory repository with zero disruption.

---

## 🏗️ System Architecture & Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant UI as React Frontend
    participant API as Express API
    participant Inv as Inventory Service
    participant Pay as Payment Simulator
    participant DB as PostgreSQL / In-Memory

    Customer->>UI: Add items to Cart & Click Checkout
    UI->>API: POST /api/checkout/reserve (Items, 600s TTL)
    API->>Inv: Check availability & Lock stock
    Inv->>DB: INSERT into reservations & Update products
    API-->>UI: 201 Created (reservationId, expiresAt)
    UI-->>Customer: Display 10-minute countdown timer

    Customer->>UI: Enter payment details & Submit Order
    UI->>API: POST /api/orders (reservationId, customer, idempotencyKey, simulationMode)
    API->>Pay: Process payment simulation (SUCCESS / FAILURE / TIMEOUT)

    alt Payment Succeeded
        Pay-->>API: Payment Approved
        API->>Inv: Commit reservation to permanent sale
        API->>DB: INSERT order & order_items, decrement total_stock
        API-->>UI: 201 Created (Order ORD-XXXX)
        UI-->>Customer: Order Confirmation modal & invoice
    else Payment Declined / Timeout
        Pay-->>API: Payment Failed
        API-->>UI: 402 / 504 Error Response
        UI-->>Customer: Helpful error alert, keep reservation active for retry
    end

    opt Customer Cancels Order
        Customer->>UI: Click "Cancel & Refund"
        UI->>API: POST /api/orders/:id/cancel
        API->>DB: Mark status = REFUNDED
        API->>Inv: Restock warehouse inventory
        API-->>UI: 200 OK (Refund details & restocked items)
    end
```

---

## 💻 Tech Stack

### Frontend

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Dev Server Proxy**: Configured in `vite.config.js` to proxy `/api` calls to the Node.js backend.

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express 4.21](https://expressjs.com/)
- **Database Driver**: [`pg` (node-postgres)](https://node-postgres.com/)
- **Security & Utils**: CORS, Dotenv, Crypto UUID generation

### Database

- **Engine**: [PostgreSQL](https://www.postgresql.org/) (with seamless in-memory fallback)
- **Data Model**: Normalized relational tables for products, reservations, reservation items, orders, order items, and idempotency records.

---

## 📂 Project Directory Structure

```text
task 02/
├── README.md                      # Project documentation (this file)
├── backend/                       # Express REST API Server
│   ├── .env.example               # Template for environment variables
│   ├── .env                       # Local environment configuration
│   ├── package.json               # Backend dependencies & scripts
│   ├── server.js                  # Main server entrypoint
│   ├── test-flow.js               # 8-step automated end-to-end integration test
│   └── src/
│       ├── data/
│       │   └── initialProducts.js # Curated catalog of Sri Lankan goods
│       ├── db/
│       │   ├── db.js              # PostgreSQL client connection & fallback engine
│       │   └── schema.sql         # Relational database schema & indexes
│       ├── routes/
│       │   ├── checkoutRoutes.js  # Stock reservation routes
│       │   ├── orderRoutes.js     # Order placement, history, & refund routes
│       │   └── productRoutes.js   # Catalog browsing & filter routes
│       └── services/
│           ├── inventoryService.js# Stock reservation & warehouse logic
│           ├── orderService.js    # Order lifecycle & idempotency control
│           └── paymentService.js  # Payment gateway simulator
└── frontend/                      # React 19 + Vite Single Page Application
    ├── index.html                 # HTML template
    ├── package.json               # Frontend dependencies & scripts
    ├── vite.config.js             # Vite config with proxy to localhost:5000
    └── src/
        ├── App.jsx                # Main application component & state coordinator
        ├── main.jsx               # React entrypoint
        ├── index.css              # Global styles with Tailwind CSS imports
        ├── components/
        │   ├── Navbar.jsx         # Header, search bar, and cart/order buttons
        │   ├── CategoryBar.jsx    # Category filter pills
        │   ├── FilterSidebar.jsx  # Price slider and stock availability filter
        │   ├── ProductCard.jsx    # Individual product display card
        │   ├── ProductDetailModal.jsx # Full product specs and details modal
        │   ├── CartDrawer.jsx     # Slide-over cart with live totals
        │   ├── CheckoutModal.jsx  # Two-step checkout with TTL hold & gateway picker
        │   ├── PaymentGateway.jsx # Interactive payment simulator interface
        │   ├── OrderConfirmationModal.jsx # Invoice & purchase success screen
        │   └── OrderHistoryModal.jsx # Customer order tracking & refund actions
        └── utils/
            └── api.js             # Centralized API fetch utilities
```

---

## 🗄️ Database Architecture

When using PostgreSQL, the backend creates and utilizes the following tables:

| Table                 | Description                                                                                                                                   |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`            | Product catalog with SKU details, price in LKR, category, rating, available stock, reserved stock, and total warehouse stock.                 |
| `reservations`        | Temporary stock locks with an expiration timestamp (`expires_at`), TTL in seconds, and status (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`). |
| `reservation_items`   | Products and quantities associated with a specific reservation lock.                                                                          |
| `orders`              | Customer purchases with shipping info, subtotal, shipping cost, total, payment status, refund ID, and idempotency key.                        |
| `order_items`         | Snapshot of purchased products, unit prices, and quantities per order.                                                                        |
| `idempotency_records` | Maps client-generated idempotency keys to order responses to guarantee safe retries.                                                          |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)
- _(Optional)_ **PostgreSQL** installed locally or hosted remotely (Neon, Supabase, Railway, Vercel Postgres). If not present, the app automatically runs in zero-configuration in-memory mode.

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - If using PostgreSQL, update the connection credentials in `.env` (see [Environment Variables](#-environment-variables)). If you wish to test with the in-memory fallback, leave them as default.

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   _The API will start at `http://localhost:5000`._

---

### 2. Frontend Setup

1. Open a second terminal and navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Launch the Vite dev server:

   ```bash
   npm run dev
   ```

   _The client will start at `http://localhost:3000` (or `http://localhost:5173`)._

4. Open your browser and navigate to the URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

---

## ⚙️ Environment Variables

Located in `backend/.env`:

| Variable       | Default Value    | Description                                                                             |
| :------------- | :--------------- | :-------------------------------------------------------------------------------------- |
| `PORT`         | `5000`           | Port for the Express backend server                                                     |
| `PGHOST`       | `localhost`      | PostgreSQL host                                                                         |
| `PGPORT`       | `5432`           | PostgreSQL port                                                                         |
| `PGUSER`       | `postgres`       | PostgreSQL username                                                                     |
| `PGPASSWORD`   | `your_password`  | PostgreSQL password                                                                     |
| `PGDATABASE`   | `serendib_store` | PostgreSQL database name                                                                |
| `DATABASE_URL` | _(Optional)_     | Full connection string URI (e.g. `postgresql://user:pass@host:5432/db?sslmode=require`) |

---

## 🧪 Running Integration Tests

The project includes an automated test runner (`test-flow.js`) that validates the complete e-commerce lifecycle through 8 critical checkpoints:

1. **Catalog & Discovery**: Loads products, category filtering, keyword search.
2. **Stock Reservation**: Verifies available stock decreases and reserved stock increases.
3. **Out-of-Stock Guard**: Confirms over-reservation requests are rejected.
4. **Payment Failure Simulation**: Validates declined card handling (`402 DECLINED`).
5. **Payment Timeout Simulation**: Validates network timeout handling (`504 GATEWAY_TIMEOUT`).
6. **Order Placement & Stock Commitment**: Validates payment success, order generation, and total warehouse stock reduction.
7. **Idempotency Verification**: Fires duplicate requests with the same key to verify cached response replay without duplicate order creation.
8. **Cancellation & Restock**: Cancels the order, verifies refund status, and confirms stock is restored to original levels.

To execute the test suite:

```bash
cd backend
npm test
```

Expected output:

```text
--- STARTING BACKEND INTEGRATION TESTS ---
[Tests] Running with backend storage: PostgreSQL (or in-memory-fallback)

✅ PASSED: Loaded 12 products
✅ PASSED: Product has price in LKR: Rs. 1650
✅ PASSED: Filtered 4 Tea & Spices products
✅ PASSED: Found 1 product(s) matching "Cinnamon"
✅ PASSED: Reservation created: res_174...
✅ PASSED: Available stock reduced from 45 to 43
✅ PASSED: Reserved stock is 2
✅ PASSED: Out-of-stock reservation correctly rejected
✅ PASSED: Payment failure returned success: false
✅ PASSED: Payment status is DECLINED
✅ PASSED: Payment timeout returned success: false
✅ PASSED: Payment status is GATEWAY_TIMEOUT
✅ PASSED: Order placed successfully
✅ PASSED: Order ID generated: ORD-XXXXXX
✅ PASSED: Order payment status is PAID
✅ PASSED: Total warehouse stock decremented to 43
✅ PASSED: Reserved stock returned to 0 after commit
✅ PASSED: Duplicate request returned success
✅ PASSED: Detected duplicate idempotency request
✅ PASSED: Returned original order without creating a new one
✅ PASSED: Order cancellation succeeded
✅ PASSED: Order status updated to REFUNDED
✅ PASSED: Refund ID generated: REF_XXXXXX
✅ PASSED: Stock fully restored to 45 after refund

=============================================
🎉 ALL BACKEND INTEGRATION TESTS PASSED!
=============================================
```

---

## 📡 REST API Reference

### 1. Products

- **`GET /api/products`**
  - **Query Params**: `search`, `category`, `minPrice`, `maxPrice`, `inStock`
  - **Response**: `{ success: true, count: number, products: [...] }`
- **`GET /api/products/:id`**
  - **Response**: `{ success: true, product: { ... } }`

### 2. Checkout & Stock Reservations

- **`POST /api/checkout/reserve`**
  - **Body**: `{ items: [{ productId: "prod-1", quantity: 2 }], ttlSeconds: 600 }`
  - **Response**: `{ success: true, reservation: { id: "res_...", expiresAt: 174... } }`
- **`GET /api/checkout/reserve/:id`**
  - **Response**: `{ success: true, reservation: { ..., remainingSeconds: 584, isExpired: false } }`
- **`POST /api/checkout/release`**
  - **Body**: `{ reservationId: "res_..." }`
  - **Response**: `{ success: true, released: true }`

### 3. Orders & Payments

- **`POST /api/orders`**
  - **Body**:
    ```json
    {
      "reservationId": "res_...",
      "customer": {
        "fullName": "Kamal Perera",
        "email": "kamal@example.lk",
        "phone": "+94 77 123 4567",
        "address": "45 Galle Road",
        "city": "Colombo",
        "district": "Western"
      },
      "paymentDetails": {
        "cardNumber": "4242424242424242",
        "cardHolder": "Kamal Perera",
        "method": "Visa"
      },
      "simulationMode": "SUCCESS",
      "idempotencyKey": "idem-uuid-string"
    }
    ```
  - **Response (201 Created)**: `{ success: true, order: { id: "ORD-...", status: "PAID", ... } }`
  - **Response (402 Declined)**: `{ success: false, status: "DECLINED", error: "..." }`
  - **Response (504 Timeout)**: `{ success: false, status: "GATEWAY_TIMEOUT", error: "..." }`
- **`GET /api/orders`**
  - **Response**: `{ success: true, count: number, orders: [...] }`
- **`GET /api/orders/:id`**
  - **Response**: `{ success: true, order: { ... } }`
- **`POST /api/orders/:id/cancel`**
  - **Body**: `{ reason: "Customer cancellation" }`
  - **Response**: `{ success: true, order: { status: "REFUNDED" }, refund: { refundId: "REF_...", ... } }`

### 4. Health Check

- **`GET /api/health`**
  - **Response**: `{ status: "online", store: "Serendib Green Store API", database: "PostgreSQL" | "in-memory-fallback", currency: "LKR (Sri Lanka Rupees)", time: "..." }`

---

## 🎮 Payment Gateway Simulation Guide

During checkout in the frontend, an interactive **Simulation Mode Selector** is available:

1. **Successful Payment (`SUCCESS`)**:
   - Simulates a legitimate, approved credit/debit card transaction.
   - Upon completion, transitions to the invoice and reduces warehouse inventory.
2. **Card Declined (`FAILURE`)**:
   - Simulates an authorization decline.
   - Preserves customer stock reservation so the user can re-try with another card without losing reserved items.
3. **Gateway Timeout (`TIMEOUT`)**:
   - Simulates payment network lag and server timeout (HTTP 504).
   - Demonstrates frontend error notification and graceful recovery.

---

## 📜 License

This project is licensed under the MIT License.
