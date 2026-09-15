// Slide-over shopping cart drawer

import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  isReserving,
}) {
  if (!isOpen) return null;

  // Calculate pricing breakdown in Sri Lanka Rupees (LKR)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const freeShippingThreshold = 5000;
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 350;
  const total = subtotal + shipping;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Close drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end" role="dialog" aria-modal="true">
      {/* Background overlay click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-gray-900">Your Shopping Cart</h2>
            <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-emerald-100/60 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free delivery progress prompt */}
        {subtotal > 0 && (
          <div className="bg-emerald-100/60 px-5 py-2.5 text-xs text-emerald-900 border-b border-emerald-200/50 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
            {shipping === 0 ? (
              <span className="font-semibold text-emerald-800">
                 Congratulations! You qualify for Free Islandwide Delivery!
              </span>
            ) : (
              <span>
                Add <strong>Rs. {amountToFreeShipping.toLocaleString()}</strong> more to get <strong>Free Islandwide Delivery</strong>!
              </span>
            )}
          </div>
        )}

        {/* Cart Line Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Your cart is empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Discover our pure Ceylon teas, artisanal spice blends, and handmade handicrafts.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            cartItems.map(({ product, quantity }) => {
              const itemTotal = product.price * quantity;
              const isMaxStock = quantity >= product.availableStock;

              return (
                <div
                  key={product.id}
                  className="flex gap-3.5 p-3 rounded-2xl bg-white border border-emerald-100/90 shadow-2xs hover:border-emerald-200 transition-colors"
                >
                  {/* Thumbnail */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-emerald-50 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      {/* Quantity buttons */}
                      <div className="flex items-center border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50/30">
                        <button
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-emerald-100 text-xs font-bold transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          disabled={isMaxStock}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-emerald-100 disabled:opacity-30 text-xs font-bold transition-colors"
                          title={isMaxStock ? 'Max available stock reached' : 'Add 1 more'}
                        >
                          +
                        </button>
                      </div>

                      {/* Item Total in Rs. */}
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-900">
                          Rs. {itemTotal.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Rs. {product.price.toLocaleString()} each
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer / Pricing Summary */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-emerald-100 bg-white space-y-4">
            {/* Price breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Islandwide Delivery</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase">Free</span>
                  ) : (
                    `Rs. ${shipping.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-emerald-100 flex justify-between text-sm font-bold text-emerald-950">
                <span>Total (LKR)</span>
                <span className="text-lg text-emerald-700">Rs. {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Stock Hold Alert */}
            <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Stock will be reserved for 10 minutes when you proceed to checkout.</span>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={onProceedToCheckout}
              disabled={isReserving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-700/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isReserving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reserving Stock...</span>
                </>
              ) : (
                <>
                  <span>Reserve Stock & Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
