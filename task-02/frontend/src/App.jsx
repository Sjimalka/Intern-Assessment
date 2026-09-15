// Main application component for Serendib Green Store

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import CategoryBar from './components/CategoryBar';
import FilterSidebar from './components/FilterSidebar';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrdersPage from './components/OrdersPage';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import {
  fetchProducts,
  reserveStock,
  releaseReservation,
  submitPaymentAndOrder,
  fetchOrders,
  cancelOrderAndRefund,
} from './utils/api';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  CreditCard,
  ShoppingBag
} from 'lucide-react';

export default function App() {
  // Navigation: 'shop' or 'orders'
  const [currentPage, setCurrentPage] = useState('shop');

  // Product catalog and filter state
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(20000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReservingStock, setIsReservingStock] = useState(false);

  // Checkout and stock reservation state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState(null);
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  // Payment simulation state
  const [simulationMode, setSimulationMode] = useState('SUCCESS'); // 'SUCCESS' | 'FAILURE' | 'TIMEOUT'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Order history and cancellation state
  const [orders, setOrders] = useState([]);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Notification toast state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 4500);
  };

  // Fetch initial catalog and orders on load
  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetchProducts();
      if (res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await fetchOrders();
      if (res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  // 10-minute stock hold countdown timer
  useEffect(() => {
    if (activeReservation && activeReservation.expiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((activeReservation.expiresAt - Date.now()) / 1000));
        setReservationSecondsLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          showToast('Your stock reservation has expired. Refreshing available inventory.');
          loadProducts(); // refresh products to show released stock
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setReservationSecondsLeft(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeReservation]);

  // Page navigation
  const handleNavigate = async (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'orders') {
      loadOrders();
    }
  };

  // Cart actions
  const handleAddToCart = (product, quantityToAdd = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.availableStock, existing.quantity + quantityToAdd);
        showToast(`Updated "${product.name}" quantity to ${newQty}.`);
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        const initialQty = Math.min(product.availableStock, quantityToAdd);
        showToast(`Added ${initialQty}x "${product.name}" to cart.`);
        return [...prevCart, { product, quantity: initialQty }];
      }
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(item.product.availableStock, newQty);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  // Reserve stock for 10 minutes and open checkout
  const handleProceedToCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setIsReservingStock(true);
      setPaymentError(null);

      // Prepare items payload for backend reservation
      const reservationItems = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      // Call /api/checkout/reserve (10-minute hold)
      const res = await reserveStock(reservationItems, 600);

      setActiveReservation(res.reservation);
      setReservationSecondsLeft(res.reservation.ttlSeconds);

      // Generate a fresh unique Idempotency Key for this checkout attempt
      const newIdempotencyKey = 'idem_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      setIdempotencyKey(newIdempotencyKey);

      // Close cart drawer and open Checkout modal
      setIsCartOpen(false);
      setIsCheckoutOpen(true);

      // Refresh product listing so inventory changes are visible
      loadProducts();
      showToast('🔒 Stock held exclusively for you for 10 minutes!');
    } catch (err) {
      alert(err.message || 'Could not reserve stock. Please check item availability.');
      loadProducts();
    } finally {
      setIsReservingStock(false);
    }
  };

  // Buy Now direct flow from product details
  const handleBuyNow = async (product, quantity = 1) => {
    const newCart = [{ product, quantity }];
    setCart(newCart);

    try {
      setIsReservingStock(true);
      const res = await reserveStock([{ productId: product.id, quantity }], 600);
      setActiveReservation(res.reservation);
      setReservationSecondsLeft(res.reservation.ttlSeconds);
      const newKey = 'idem_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      setIdempotencyKey(newKey);
      setSelectedProduct(null);
      setIsCheckoutOpen(true);
      loadProducts();
    } catch (err) {
      alert(err.message || 'Could not reserve stock for Buy Now.');
    } finally {
      setIsReservingStock(false);
    }
  };

  // One-click demo cart loader for rapid testing of the payment gateway
  const handleLoadDemoCart = async () => {
    if (products.length === 0) return;
    const sampleProduct = products.find((p) => p.availableStock > 0) || products[0];
    const newCart = [{ product: sampleProduct, quantity: 1 }];
    setCart(newCart);

    try {
      setIsReservingStock(true);
      const res = await reserveStock([{ productId: sampleProduct.id, quantity: 1 }], 600);
      setActiveReservation(res.reservation);
      setReservationSecondsLeft(res.reservation.ttlSeconds);
      const newKey = 'idem_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      setIdempotencyKey(newKey);
      showToast(`Loaded "${sampleProduct.name}" and locked stock for 10 minutes!`);
      loadProducts();
    } catch (err) {
      alert(err.message || 'Could not load demo cart.');
    } finally {
      setIsReservingStock(false);
    }
  };

  // Submit payment with idempotency duplicate protection
  const handleProcessPayment = async ({ customer, paymentDetails }) => {
    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      let currentReservation = activeReservation;

      // Resilient Fallback: If no active reservation exists, auto-reserve for current cart
      if (!currentReservation || reservationSecondsLeft <= 0) {
        if (cart.length === 0) {
          throw new Error('Your cart is empty. Please add items before completing payment.');
        }
        const reservationItems = cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }));
        const reserveRes = await reserveStock(reservationItems, 600);
        if (!reserveRes || !reserveRes.reservation) {
          throw new Error(reserveRes?.error || 'Could not reserve stock for checkout. Please check item availability.');
        }
        currentReservation = reserveRes.reservation;
        setActiveReservation(reserveRes.reservation);
        setReservationSecondsLeft(reserveRes.reservation.ttlSeconds);
      }

      // Ensure a valid idempotency key is passed
      const effectiveIdempotencyKey =
        idempotencyKey || ('idem_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now());

      const orderPayload = {
        reservationId: currentReservation.id,
        customer,
        paymentDetails,
        simulationMode,
        idempotencyKey: effectiveIdempotencyKey,
      };

      const res = await submitPaymentAndOrder(orderPayload);

      // Payment succeeded!
      if (res && res.success && res.order) {
        setConfirmedOrder(res.order);
        setActiveReservation(null);
        setCart([]); // Clear cart
        setIsCheckoutOpen(false); // Close checkout modal

        // Reload data
        loadProducts();
        await loadOrders();
        showToast('🎉 Order placed successfully! Stock committed.');
      } else {
        throw new Error(res?.error || res?.message || 'Payment could not be confirmed. Please try again.');
      }
    } catch (err) {
      console.warn('Payment failed/stalled:', err.message);
      setPaymentError(err.message || 'Payment was declined or timed out.');

      // Refresh idempotency key on any failure so user can retry immediately
      const retryKey = 'idem_retry_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      setIdempotencyKey(retryKey);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Cancel order, simulate refund, and restore stock
  const handleCancelOrder = async (orderId, reason) => {
    try {
      setCancellingOrderId(orderId);
      const res = await cancelOrderAndRefund(orderId, reason);

      // Refresh catalog & orders list
      await loadProducts();
      await loadOrders();
      showToast(`✅ Order ${orderId} refunded and inventory restored!`);
      return res;
    } catch (err) {
      console.error('Cancellation failed:', err);
      throw err;
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Filter and sort products for the shop catalog
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (activeCategory && activeCategory !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Max price slider
    list = list.filter((p) => p.price <= maxPrice);

    // In stock filter
    if (inStockOnly) {
      list = list.filter((p) => p.availableStock > 0);
    }

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, activeCategory, searchQuery, maxPrice, inStockOnly, sortBy]);

  // Cart totals
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col font-sans text-gray-800 pb-16 md:pb-0">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-5 right-5 z-60 bg-emerald-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-700 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar with Page Navigation Tabs */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        cartCount={cartCount}
        cartTotal={cartTotal}
        ordersCount={orders.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => handleNavigate('orders')}
        activeReservation={activeReservation}
        reservationSecondsLeft={reservationSecondsLeft}
        onOpenCheckout={() => {
          if (cart.length > 0) {
            setIsCheckoutOpen(true);
          } else {
            setIsCartOpen(true);
          }
        }}
      />

      {/* Shop view */}
      {currentPage === 'shop' && (
        <>
          {/* Category Bar */}
          <CategoryBar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          {/* Hero Welcome Banner */}
          <div className="bg-gradient-to-b from-white to-[#F0FDF4] border-b border-emerald-100/70 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
              <div className="space-y-3 max-w-2xl text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-emerald-100/70 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
                  <span>Sri Lanka's Finest Artisanal Marketplace</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-950 tracking-tight leading-tight">
                  Authentic Ceylon Treasures, Delivered with Care.
                </h1>
                <p className="text-xs sm:text-base text-gray-600 leading-relaxed">
                  Explore handpicked silver tip teas, certified organic cinnamon, handcrafted coconut tableware, and artisanal batik. Protected by <strong>10-minute stock reservation</strong> and mock payment gateway simulation.
                </p>
              </div>
            </div>
          </div>

          {/* Main Catalog Content Area */}
          <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left Column: Filter Sidebar (Always shown on desktop, collapsible on mobile/tablet) */}
              <div className={`lg:col-span-3 ${isMobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
                <FilterSidebar
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  onReset={() => {
                    setMaxPrice(20000);
                    setInStockOnly(false);
                    setSortBy('featured');
                    setActiveCategory('All');
                    setSearchQuery('');
                  }}
                  totalResultsCount={filteredProducts.length}
                />
              </div>

              {/* Right Column: Product Grid */}
              <div className="lg:col-span-9 space-y-5 sm:space-y-6">
                {/* Results Header Bar */}
                <div className="bg-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="text-xs text-gray-600 truncate">
                    Category: <strong className="text-emerald-950">{activeCategory}</strong>
                    {searchQuery && (
                      <span className="hidden sm:inline"> &bull; Searching: <strong className="text-emerald-800">"{searchQuery}"</strong></span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Mobile Filter Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                      className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isMobileFiltersOpen ? 'Hide Filters' : 'Filters & Sort'}</span>
                      {(inStockOnly || maxPrice < 20000 || sortBy !== 'featured') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </button>

                    <div className="text-xs font-semibold text-emerald-800">
                      {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Product Grid */}
                {isLoadingProducts ? (
                  <div className="py-24 text-center text-xs text-gray-500 space-y-3">
                    <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Loading Ceylon artisan catalog...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-emerald-100 p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No products match your criteria</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Try adjusting the maximum price slider, checking all categories, or clearing your search query.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMaxPrice(20000);
                        setInStockOnly(false);
                        setActiveCategory('All');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelectProduct={setSelectedProduct}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {/* Orders view */}
      {currentPage === 'orders' && (
        <OrdersPage
          orders={orders}
          isLoading={isLoadingOrders}
          onCancelOrder={handleCancelOrder}
          cancellingOrderId={cancellingOrderId}
          onRefreshOrders={loadOrders}
          onNavigateToShop={() => handleNavigate('shop')}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100 mt-12 sm:mt-16 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-emerald-50 text-xs">
            <div className="space-y-2">
              <div className="text-emerald-950 font-bold text-sm">SerendibGreen Store</div>
              <p className="text-gray-500 leading-relaxed">
                Celebrating authentic Sri Lankan artisans, organic cultivators, and sustainable heritage.
              </p>
            </div>

            <div className="space-y-1.5 text-gray-600">
              <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Pages & Flows</div>
              <div>
                <button onClick={() => handleNavigate('shop')} className="hover:text-emerald-700 cursor-pointer">
                  &bull; Shop Catalog
                </button>
              </div>
              <div>
                <button
                  onClick={() => {
                    if (cart.length > 0) {
                      setIsCheckoutOpen(true);
                    } else {
                      setIsCartOpen(true);
                    }
                  }}
                  className="hover:text-emerald-700 cursor-pointer"
                >
                  &bull; Cart & Checkout
                </button>
              </div>
              <div>
                <button onClick={() => handleNavigate('orders')} className="hover:text-emerald-700 cursor-pointer">
                  &bull; My Orders & Refunds Page
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-gray-600">
              <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Gateway Simulations</div>
              <div>&bull;  Successful Authorization</div>
              <div>&bull;  Card Declined Simulation</div>
              <div>&bull; Gateway Timeout Simulation</div>
              <div>&bull; Idempotent Key Protection</div>
            </div>

            <div className="space-y-2 text-gray-600">
              <div className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Islandwide Coverage</div>
              <p className="leading-relaxed">
                Islandwide delivery across all 25 districts of Sri Lanka including Colombo, Kandy, Galle, Gampaha, and Jaffna.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
            <span>&copy; {new Date().getFullYear()} SerendibGreen Store.</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {/* 1. Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty) => handleAddToCart(p, qty)}
        onBuyNow={(p, qty) => handleBuyNow(selectedProduct, qty || 1)}
      />

      {/* 2. Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
        isReserving={isReservingStock}
      />

      {/* 3. Checkout & Mock Payment Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cart}
        reservation={activeReservation}
        reservationSecondsLeft={reservationSecondsLeft}
        onPay={handleProcessPayment}
        isProcessingPayment={isProcessingPayment}
        paymentError={paymentError}
        idempotencyKey={idempotencyKey}
        simulationMode={simulationMode}
        setSimulationMode={setSimulationMode}
      />

      {/* 4. Order Confirmation Receipt Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onOpenOrders={() => {
          setConfirmedOrder(null);
          handleNavigate('orders');
        }}
      />
    </div>
  );
}
