#POSS SYSTEM LINK =https://intern-assessment-47ntzsu7i-sjhasinduimalka-gmailcoms-projects.vercel.app/
# ApexPOS: High-Performance Point-of-Sale & Inventory Concurrency System

ApexPOS is an enterprise point-of-sale and inventory management application built to handle high-concurrency order creation, atomic stock reservations with automated 5-minute expiry, mock payment gateway simulations (success, failure, timeout), duplicate payment idempotency, and full order lifecycle state transitions backed by **PostgreSQL**.

---

## Key Features

1. **Zero-Overselling Concurrency Protection in PostgreSQL**:
   - Built using **PostgreSQL** connection pooling (`pg.Pool`) with atomic ACID transactions.
   - When multiple customers attempt to purchase the same limited-stock item at the exact same instant, row-level exclusive locks are acquired via `SELECT ... FOR UPDATE`.
   - As available stock is consumed, subsequent concurrent checkout attempts detect insufficient inventory, rollback safely, and return `HTTP 409 Conflict`.
   - Verified via automated CLI stress tests with 25 simultaneous concurrent buyers.

2. **Stock Reservation & 5-Minute Auto-Expiry**:
   - Stock is temporarily reserved the moment a user initiates checkout from the cart.
   - Each reservation has a 5-minute countdown window (`expires_at = Date.now() + 5 * 60 * 1000`).
   - A background worker (`src/workers/expiryWorker.js`) scans every 5 seconds; any expired reservation automatically releases its reserved stock back to available inventory.
   - A live countdown timer and progress bar inform the cashier/customer in real-time.
   - An instant "Test Expiry" button allows demonstration of the stock release without waiting 5 full minutes.

3. **Mock Payment Gateway & Idempotency**:
   - Simulates realistic payment gateway interactions with three distinct outcomes:
     - **Success**: Confirms order (`PAID`), permanently deducts physical inventory, and issues a receipt.
     - **Card Decline / Failure**: Rejects payment, transitions order to `FAILED`, and immediately restores reserved stock.
     - **Gateway Timeout**: Rejects payment, transitions order to `EXPIRED`, and immediately restores reserved stock.
   - **Idempotency Protection**: Every checkout session generates an `idempotencyKey`. Duplicate submissions or double-clicks return the existing transaction record without charging or deducting stock twice.

4. **Order Lifecycle State Machine**:
   - Enforces valid transitions between statuses:
     - `PENDING` &rarr; `RESERVED` &rarr; `PAID`
     - `RESERVED` &rarr; `FAILED` (decline)
     - `RESERVED` &rarr; `EXPIRED` (timeout / 5 min timer)
     - `RESERVED` &rarr; `CANCELLED` (user cancellation)
   - Stock is restored for any cancelled, expired, or failed order.

5. **Modern React & Tailwind CSS Frontend**:
   - **POS Register**: Product grid with category filters, live stock breakdown badges (Available, In Checkout, Total), and dynamic cart with stock limits.
   - **Stock & Products Manager**: Full CRUD operations with computer image upload, quick restock buttons (`+5`, `+20`), and stock alert metrics.
   - **Orders & Receipts**: Filter orders by status, view detailed line items, and inspect transaction details.
   - **Audit Trail**: Complete chronological ledger of every inventory movement (CREATE, RESERVE, RELEASE, DEDUCT, RESTOCK).
   - **Mobile Responsiveness**: Adaptive layouts, swipe navigation tabs, floating bottom cart pill, and mobile slide-up drawer for all screens.

---

## Directory Structure

```
task 01/
├── backend/
│   ├── .env                    # PostgreSQL connection configuration
│   ├── .env.example            # Example configuration template
│   ├── src/
│   │   ├── db.js               # PostgreSQL connection pool, schema, seed data
│   │   ├── server.js           # Express app, CORS, error handling, worker startup
│   │   ├── routes/
│   │   │   └── api.js          # REST API endpoints (async)
│   │   ├── services/
│   │   │   ├── inventoryService.js # Product CRUD & stock calculations (async)
│   │   │   ├── orderService.js     # Cart checkout, SELECT ... FOR UPDATE reservation
│   │   │   └── paymentService.js   # Gateway simulation & idempotency guard
│   │   ├── workers/
│   │   │   └── expiryWorker.js # 5-second background auto-expiry worker
│   │   └── scripts/
│   │       ├── initDb.js       # PostgreSQL table & index initialization
│   │       └── resetDb.js      # Seed catalog in Sri Lankan Rupees (Rs.)
│   ├── test-concurrency.js     # Automated CLI concurrency test suite
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation with status badges
│   │   │   ├── ProductCatalog.jsx  # Catalog grid with live stock badges
│   │   │   ├── CartPanel.jsx       # Cart items, totals, and checkout trigger
│   │   │   ├── CheckoutModal.jsx   # 5-min timer, mock gateway, idempotency test
│   │   │   ├── OrdersView.jsx      # Order lifecycle & receipt viewer
│   │   │   ├── InventoryManager.jsx# Product CRUD & stock manager
│   │   │   └── AuditLogView.jsx    # Real-time inventory audit ledger
│   │   ├── utils/
│   │   │   └── currency.js         # Sri Lankan Rupees (Rs. / LKR) formatter
│   │   ├── api.js              # Frontend API client
│   │   ├── App.jsx             # Root React component
│   │   └── index.css           # Tailwind CSS & theme styling
│   ├── vite.config.js
│   └── package.json
├── README.md
└── package.json
```

---

## PostgreSQL Configuration

Edit `backend/.env` to configure your PostgreSQL database connection:

```env
# Full connection string (supports Neon, Supabase, Render, local):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_db

# Or individual parameters:
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=pos_db
PGSSL=false
```

### Database Management Commands

```bash
# Initialize tables and indexes:
npm run db:init --prefix backend

# Reset and seed sample products in Sri Lankan Rupees (Rs.):
npm run db:reset --prefix backend
```

---

## How to Run

### 1. Start the Backend Server
```bash
cd backend
npm install
npm start
```
The backend starts at `http://localhost:5000`.

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:5173`.

### 3. Run Automated Concurrency Benchmark
To run the automated CLI test verifying zero overselling under 25 simultaneous buyers:
```bash
cd backend
npm run test:concurrency
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Returns all products with computed `available_stock` |
| `POST` | `/api/products` | Create a new product in the catalog |
| `PUT` | `/api/products/:id` | Update product details or stock |
| `DELETE` | `/api/products/:id` | Delete product (if no active reservations) |
| `POST` | `/api/checkout` | Convert cart to order & reserve stock (concurrency protected) |
| `GET` | `/api/orders` | List orders (optional `?status=` filter) |
| `GET` | `/api/orders/:id` | Get single order details with live remaining seconds |
| `POST` | `/api/orders/:id/cancel` | Cancel reservation & restore reserved stock |
| `POST` | `/api/orders/:id/expire` | Test immediate expiration of reservation |
| `POST` | `/api/payments/process` | Process mock payment (idempotent; success, failure, timeout) |
| `GET` | `/api/inventory/audit` | View inventory movement audit log |
| `POST` | `/api/system/reset` | Reset database to clean initial seed |
| `POST` | `/api/system/trigger-expiry-check` | Force run reservation expiry check |
