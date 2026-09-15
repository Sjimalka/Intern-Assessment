// Receipt modal displayed after a successful payment

import React from 'react';
import { CheckCircle2, ShoppingBag, History, ArrowRight, ShieldCheck, MapPin, Copy } from 'lucide-react';

export default function OrderConfirmationModal({ order, onClose, onOpenOrders }) {
  // Close modal on Escape key (Hook must be at top level before early returns)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (order) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center space-y-2">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xs rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Order Confirmed!
          </h2>
          <p className="text-xs text-emerald-100 max-w-sm mx-auto">
            Payment captured successfully. Your stock reservation has been permanently committed.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-xs">
            <div>
              <span className="text-gray-500 block">Order Number</span>
              <span className="font-bold text-emerald-950 font-mono text-sm">{order.id}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Transaction ID</span>
              <span className="font-bold text-emerald-950 font-mono text-sm truncate block" title={order.payment.transactionId}>
                {order.payment.transactionId}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Payment Method: {order.payment.method} ({order.payment.cardLast4})
              </span>
              <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="text-xs space-y-1">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Delivery Destination
            </span>
            <p className="text-gray-600 pl-5">
              {order.customer.fullName} — {order.customer.address}, {order.customer.city}, {order.customer.district} ({order.customer.phone})
            </p>
          </div>

          {/* Items Purchased List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
              Purchased Items
            </span>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                      {item.quantity}
                    </span>
                    <span className="text-gray-800 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-emerald-950">
                    Rs. {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-700">Total Paid (LKR)</span>
            <span className="text-2xl font-black text-emerald-800">
              Rs. {order.pricing.total.toLocaleString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenOrders();
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>View Order History</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
