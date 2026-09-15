// Modal showing full product details, specs, and stock availability

import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, Check, ShieldCheck, Truck, RefreshCw, AlertCircle } from 'lucide-react';

export default function ProductDetailModal({ product, onClose, onAddToCart, onBuyNow }) {
  const [quantity, setQuantity] = useState(1);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const isOutOfStock = product.availableStock <= 0;

  const handleIncrement = () => {
    if (quantity < product.availableStock) {
      setQuantity(q => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top-Right Close Button (Always visible & clickable with z-50) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-50 w-10 h-10 bg-white/95 hover:bg-white text-gray-700 hover:text-gray-950 p-2 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Close modal"
          title="Close (Esc)"
        >
          <X className="w-5 h-5 text-gray-800" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Product Image Panel */}
            <div className="relative aspect-4/3 sm:aspect-square md:aspect-auto bg-emerald-50/40 p-4 sm:p-6 flex items-center justify-center">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full max-h-72 sm:max-h-96 object-cover rounded-2xl shadow-sm"
              />
              {product.badge && (
                <span className="absolute top-6 left-6 bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Product Info Panel */}
            <div className="p-5 sm:p-8 flex flex-col justify-between space-y-5 sm:space-y-6">
              <div className="space-y-3.5 sm:space-y-4">
                {/* Category & Rating */}
                <div className="flex items-center justify-between pr-10 sm:pr-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs sm:text-sm">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                    <span className="text-gray-900">{product.rating}</span>
                    <span className="text-gray-400 font-normal">({product.reviewsCount})</span>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-snug">
                  {product.name}
                </h2>

                {/* Price in Sri Lankan Rupees */}
                <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
                    Rs. {product.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">Includes all local taxes</span>
                </div>

                {/* Stock transparency banner */}
                <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-emerald-950">Availability Status</span>
                    {isOutOfStock ? (
                      <span className="text-rose-600 font-bold">Out of Stock</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">
                        {product.availableStock} Units Ready to Ship
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Warehouse Physical Stock: {product.totalStock}</span>
                    {product.reservedStock > 0 && (
                      <span className="text-amber-700 font-medium">
                        ({product.reservedStock} held in checkout)
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {product.description}
                </p>

                {/* Key Features Bullet List */}
                {product.features && product.features.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Product Highlights</h4>
                    <ul className="space-y-1 text-xs text-gray-600">
                      {product.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-3.5 sm:space-y-4 pt-3 sm:pt-4 border-t border-emerald-100">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <span className="text-xs font-semibold text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-emerald-200 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={isOutOfStock || quantity <= 1}
                      className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={isOutOfStock || quantity >= product.availableStock}
                      className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    Total: <strong className="text-emerald-900">Rs. {(product.price * quantity).toLocaleString()}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(product, quantity);
                      onClose();
                    }}
                    disabled={isOutOfStock}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-xl border border-emerald-600 text-emerald-700 font-semibold text-xs sm:text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(product, quantity);
                      onClose();
                      onBuyNow();
                    }}
                    disabled={isOutOfStock}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Buy Now</span>
                  </button>
                </div>

                {/* Mobile-Friendly Close Button at the Bottom */}
                <div className="sm:hidden pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-xs hover:bg-gray-50 transition-colors"
                  >
                    Close Window
                  </button>
                </div>

                {/* Guarantees */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[10.5px] sm:text-[11px] text-gray-500 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                    <span>10-min Hold</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                    <span>Islandwide</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                    <span>Easy Refund</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
