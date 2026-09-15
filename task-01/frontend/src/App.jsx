import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import ProductCatalog from './components/ProductCatalog';
import CartPanel from './components/CartPanel';
import CheckoutModal from './components/CheckoutModal';
import OrdersView from './components/OrdersView';
import InventoryManager from './components/InventoryManager';
import AuditLogView from './components/AuditLogView';
import { AlertCircle, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { formatLKR } from './utils/currency';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [activeCheckoutOrder, setActiveCheckoutOrder] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState(null);
  const [dbError, setDbError] = useState(null);

  // show popup message
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // load products from backend
  const loadProducts = useCallback(async () => {
    try {
      const data = await api.getProducts();
      setProducts(Array.isArray(data) ? data : []);
      setDbError(null);
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
      setDbError(err.message || 'Unable to connect to database');
    }
  }, []);

  // load orders from backend
  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrders([]);
    }
  }, []);

  // load audit logs from backend
  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setAuditLogs([]);
    }
  }, []);

  // load data when page first opens
  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]).finally(() => {
      setIsLoading(false);
    });
  }, [loadProducts, loadOrders, loadAuditLogs]);

  // check for updates every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadProducts();
      loadOrders();
      if (activeTab === 'audit') {
        loadAuditLogs();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [loadProducts, loadOrders, loadAuditLogs, activeTab]);

  // add product to cart
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.available_stock) {
          showToast(`Cannot add more than ${product.available_stock} available units.`, 'error');
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url
      }];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.available_stock) {
      showToast(`Only ${product.available_stock} units available in stock.`, 'error');
      return;
    }
    setCart(prev => prev.map(item =>
      item.productId === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // reserve stock for 5 minutes and start checkout
  const handleProceedToCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
    try {
      const order = await api.checkout({
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        customerName: customerName.trim() || 'Walk-in Customer'
      });

      setActiveCheckoutOrder(order);
      setCart([]); // Clear cart as items are now reserved in order
      await Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]);
      showToast(`Stock locked for 5 minutes! Order #${order.order_number} created.`);
    } catch (err) {
      showToast(err.message || 'Failed to initiate checkout', 'error');
      await loadProducts(); // Refresh products in case of stock change
    } finally {
      setIsLoading(false);
    }
  };

  // update list after payment finishes
  const handlePaymentComplete = async (updatedOrder) => {
    await Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]);
    if (updatedOrder && updatedOrder.status === 'PAID') {
      showToast(`Payment Confirmed! Order #${updatedOrder.order_number} has been paid successfully.`);
    } else if (updatedOrder && updatedOrder.status === 'FAILED') {
      showToast(`Payment Declined: Order #${updatedOrder.order_number} failed. Stock released back to inventory.`, 'error');
    } else {
      showToast(`Payment processed: Order #${updatedOrder?.order_number || ''} is ${updatedOrder?.status || 'processed'}.`, 'error');
    }
  };

  // cancel order and give stock back
  const handleCancelOrder = async (orderId) => {
    try {
      await api.cancelOrder(orderId, 'Cashier cancelled order');
      await Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]);
      showToast('Order cancelled and reserved stock restored.');
    } catch (err) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  // expire order right now for testing
  const handleExpireOrder = async (orderId) => {
    try {
      await api.expireOrder(orderId);
      await Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]);
      showToast('Order expired and reserved stock restored to available inventory.');
    } catch (err) {
      showToast(err.message || 'Failed to expire order', 'error');
    }
  };

  // reopen checkout for this order
  const handleResumeCheckout = (order) => {
    setActiveCheckoutOrder(order);
  };

  // product actions
  const handleCreateProduct = async (productData) => {
    const created = await api.createProduct(productData);
    await Promise.all([loadProducts(), loadAuditLogs()]);
    showToast(`Created product: ${created.name}`);
    return created;
  };

  const handleUpdateProduct = async (id, productData) => {
    const updated = await api.updateProduct(id, productData);
    await Promise.all([loadProducts(), loadAuditLogs()]);
    showToast(`Updated product: ${updated.name}`);
    return updated;
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(id);
      await Promise.all([loadProducts(), loadAuditLogs()]);
      showToast('Product deleted.');
    } catch (err) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // reset back to sample products
  const handleResetData = async () => {
    if (!window.confirm('Reset catalog and orders back to default initial seed?')) return;
    setIsResetting(true);
    try {
      await api.resetSystem();
      setCart([]);
      setActiveCheckoutOrder(null);
      await Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]);
      showToast('Database reset to fresh test data successfully.');
    } catch (err) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      {/* popup notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xl flex items-center gap-3 text-xs font-bold backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-white border-neutral-300 text-neutral-950'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-neutral-950 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* top navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        isResetting={isResetting}
        cartCount={totalCartCount}
        onOpenMobileCart={() => setIsMobileCartOpen(true)}
      />

      {/* database connection warning banner if PostgreSQL is unreachable */}
      {dbError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Database Notice:</strong> Unable to connect to PostgreSQL ({dbError}). Please ensure PostgreSQL is running or verify your credentials in <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">backend/.env</code>.
            </span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              Promise.all([loadProducts(), loadOrders(), loadAuditLogs()]).finally(() => setIsLoading(false));
            }}
            className="px-3 py-1 bg-neutral-950 hover:bg-black text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* page tab content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col">
        {activeTab === 'pos' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start pb-20 lg:pb-0">
            <ProductCatalog
              products={products}
              cart={cart}
              onAddToCart={handleAddToCart}
            />
            {/* desktop cart sidebar */}
            <div className="hidden lg:block sticky top-24">
              <CartPanel
                cart={cart}
                products={products}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onProceedToCheckout={handleProceedToCheckout}
                customerName={customerName}
                setCustomerName={setCustomerName}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={products}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            onRefresh={loadOrders}
            onResumeCheckout={handleResumeCheckout}
            onCancelOrder={handleCancelOrder}
            onExpireOrder={handleExpireOrder}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogView
            logs={auditLogs}
            onRefresh={loadAuditLogs}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* floating bottom cart pill on mobile when items are in cart */}
      {activeTab === 'pos' && cart.length > 0 && (
        <div className="fixed bottom-4 left-3 right-3 z-30 lg:hidden animate-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full py-3.5 px-4 bg-neutral-950 hover:bg-black text-white rounded-2xl shadow-2xl border border-neutral-800 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white text-neutral-950 flex items-center justify-center font-black text-xs shadow-xs">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Current Order</span>
                <span className="text-sm font-extrabold font-mono text-white">{formatLKR(cartSubtotal * 1.08)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-neutral-800 px-3 py-1.5 rounded-xl text-neutral-200">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* mobile cart drawer / sheet */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-neutral-300 animate-in slide-in-from-bottom-6 duration-200">
            <CartPanel
              cart={cart}
              products={products}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onProceedToCheckout={async () => {
                await handleProceedToCheckout();
                setIsMobileCartOpen(false);
              }}
              customerName={customerName}
              setCustomerName={setCustomerName}
              isLoading={isLoading}
              onCloseMobile={() => setIsMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* checkout popup with timer and payment options */}
      {activeCheckoutOrder && (
        <CheckoutModal
          order={activeCheckoutOrder}
          onClose={() => setActiveCheckoutOrder(null)}
          onPaymentComplete={handlePaymentComplete}
          onCancelOrder={handleCancelOrder}
          onExpireOrder={handleExpireOrder}
          api={api}
        />
      )}
    </div>
  );
}
