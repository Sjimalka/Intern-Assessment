import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, AlertCircle, Sparkles, X } from 'lucide-react';
import { formatLKR } from '../utils/currency';

export default function CartPanel({ 
  cart = [], 
  products = [], 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onProceedToCheckout,
  customerName,
  setCustomerName,
  isLoading,
  onCloseMobile
}) {
  const safeCart = Array.isArray(cart) ? cart : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // calculate subtotal and tax in LKR
  const subtotal = safeCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% POS tax
  const total = subtotal + tax;

  // make sure cart doesn't have more than what's available
  const stockIssues = safeCart.map(item => {
    const liveProd = safeProducts.find(p => p.id === item.productId);
    if (!liveProd) return { ...item, error: 'Product no longer exists' };
    if (liveProd.available_stock < item.quantity) {
      return {
        ...item,
        available: liveProd.available_stock,
        error: `Only ${liveProd.available_stock} available (you requested ${item.quantity})`
      };
    }
    return null;
  }).filter(Boolean);

  const hasStockIssue = stockIssues.length > 0;

  return (
    <div className="w-full lg:w-96 bg-white rounded-2xl border border-neutral-200 flex flex-col h-full shadow-sm">
      {/* cart header and clear button */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-950">Active Cart</h2>
            <p className="text-[11px] text-neutral-500">{cart.length} unique item{cart.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-[11px] font-semibold text-neutral-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-neutral-100"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200/70 transition-colors"
              title="Close Cart"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* cart items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-sm font-bold text-neutral-700">Cart is empty</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">Select products from the catalog to begin an order.</p>
          </div>
        ) : (
          cart.map(item => {
            const liveProd = products.find(p => p.id === item.productId);
            const available = liveProd ? liveProd.available_stock : 0;
            const isExceeded = available < item.quantity;

            return (
              <div 
                key={item.productId}
                className={`p-3 rounded-xl border transition-all ${
                  isExceeded 
                    ? 'bg-red-50/50 border-red-300 text-red-900' 
                    : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{item.name}</h4>
                    <span className="text-[11px] text-neutral-500 font-mono">{formatLKR(item.price)} each</span>
                  </div>
                  <div className="text-xs font-extrabold text-neutral-950 font-mono">
                    {formatLKR(item.price * item.quantity)}
                  </div>
                </div>

                {isExceeded && (
                  <div className="text-[10px] text-red-600 flex items-center gap-1 mb-2 bg-red-100 p-1.5 rounded-lg">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Live stock dropped to {available}! Reduce quantity.</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="text-xs font-bold text-neutral-900 px-1 w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= available}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4 text-neutral-400 hover:text-red-600" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* customer and price breakdown */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/70 space-y-3 rounded-b-2xl">
          <div>
            <label className="text-[11px] font-bold text-neutral-700 block mb-1">Customer / Register Note</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Counter Guest / Walk-in"
              className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">{formatLKR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Sales Tax (8%)</span>
              <span className="font-mono font-medium">{formatLKR(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-neutral-950 pt-2 border-t border-neutral-200">
              <span>Total Due</span>
              <span className="text-neutral-950 font-mono text-base font-black">{formatLKR(total)}</span>
            </div>
          </div>

          {/* stock issue alert */}
          {hasStockIssue && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Some items exceed live stock. Adjust cart to continue.</span>
            </div>
          )}

          {/* reserve and checkout button */}
          <button
            onClick={onProceedToCheckout}
            disabled={cart.length === 0 || hasStockIssue || isLoading}
            className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98 min-h-[44px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Reserving Stock & Creating Order...
              </span>
            ) : (
              <>
                <span>Enter Checkout (Reserve 5 Min)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-neutral-500 font-medium">
            Stock is atomically locked for 5 minutes upon checkout.
          </p>
        </div>
      )}
    </div>
  );
}
