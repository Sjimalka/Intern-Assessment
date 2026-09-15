# 🌿 Serendib Green Store — Frontend Client

The frontend client for **Serendib Green Store**, built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Lucide React**.

For complete system architecture, API reference, and full-stack documentation, please see the [Root README](../README.md).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will run at `http://localhost:3000` (or `http://localhost:5173`) with Hot Module Replacement (HMR).

### 3. Build for Production
```bash
npm run build
```

### 4. Run Linter
```bash
npm run lint
```

---

## 🎨 Features & Component Architecture

- **`Navbar.jsx`**: Brand identity, live search bar, category shortcuts, order history trigger, and interactive cart badge.
- **`CategoryBar.jsx`**: Fast category tabs (Tea & Spices, Organic Food, Coconut & Palm, Herbal & Wellness, Eco Living).
- **`FilterSidebar.jsx`**: Interactive price range filter and in-stock only toggle.
- **`ProductCard.jsx`**: Visual product cards featuring ratings, origin tags, available stock indicators, quick "Add to Cart" and modal trigger.
- **`ProductDetailModal.jsx`**: Detailed specifications, eco-certifications, ingredient breakdown, and quantity selector.
- **`CartDrawer.jsx`**: Slide-over drawer with item increment/decrement, live subtotal, and checkout entry.
- **`CheckoutModal.jsx`**: Two-stage checkout flow with real-time 10-minute stock hold countdown and shipping form.
- **`PaymentGateway.jsx`**: Interactive payment simulation tool with test outcomes (**Success**, **Card Declined**, **Gateway Timeout**).
- **`OrderConfirmationModal.jsx`**: Order invoice with transaction IDs, summary, and receipt download/print support.
- **`OrderHistoryModal.jsx`**: View past orders, payment statuses, and trigger immediate order cancellations with stock refunds.

---

## 🔗 Backend Connection & API Proxy

API requests sent to `/api/*` are automatically forwarded to `http://localhost:5000` via the Vite proxy configured in `vite.config.js`:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```
