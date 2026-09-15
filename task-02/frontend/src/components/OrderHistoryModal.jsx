// Order history modal with cancellation and refund support

import React, { useState } from 'react';
import {
  X,
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Package,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function OrderHistoryModal({
  isOpen,
  onClose,
  orders,
  isLoading,
  onCancelOrder,
  cancellingOrderId,
  onRefreshOrders,
}) {
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Customer changed mind');
  const [refundAlert, setRefundAlert] = useState(null);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return;
    try {
      const res = await onCancelOrder(selectedOrderToCancel.id, cancellationReason);
      setRefundAlert(res.message);
      setSelectedOrderToCancel(null);
    } catch (err) {
      alert(err.message || 'Failed to cancel order');
    }
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedOrderToCancel) {
          setSelectedOrderToCancel(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedOrderToCancel, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-emerald-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Order History & Refund Management
              </h2>
              <span className="text-xs text-emerald-800">
                Track status, review invoices, or cancel & refund orders
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshOrders}
              className="p-2 rounded-xl text-gray-400 hover:text-emerald-700 hover:bg-emerald-100/50 transition-colors"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-emerald-100/50 transition-colors"
              aria-label="Close orders"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Refund Success Banner if an order was just refunded */}
        {refundAlert && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-bold block">Refund Processed & Stock Restored!</span>
              <p className="text-emerald-800/90">{refundAlert}</p>
            </div>
            <button
              onClick={() => setRefundAlert(null)}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Orders Scrollable List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-2">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading your past orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">No orders placed yet</h3>
              <p className="max-w-xs mx-auto text-gray-500">
                Browse our catalog, add Ceylon goods to your cart, and complete mock checkout to test!
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isPaid = order.status === 'PAID';
              const isRefunded = order.status === 'REFUNDED';
              const isCancelling = cancellingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-emerald-100 hover:border-emerald-200 shadow-2xs p-4 sm:p-5 space-y-3.5 transition-all"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-900 text-sm">
                        {order.id}
                      </span>
                      <span className="text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-LK', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPaid && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 text-[11.5px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Paid & Confirmed
                        </span>
                      )}
                      {isRefunded && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 text-[11.5px]">
                          <RotateCcw className="w-3 h-3 text-purple-600" />
                          Refunded & Restocked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchased items list */}
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-800 font-bold">{item.quantity}x</span>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment & Refund breakdown */}
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/70 text-xs space-y-1">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Delivery to: {order.customer.fullName} ({order.customer.city})</span>
                      <span>Transaction: <strong className="font-mono text-gray-900">{order.payment.transactionId}</strong></span>
                    </div>

                    {isRefunded && order.refund && (
                      <div className="pt-2 border-t border-emerald-100 flex justify-between items-center text-purple-900 font-semibold text-[11.5px]">
                        <span>Refund ID: <strong className="font-mono">{order.refund.refundId}</strong></span>
                        <span>Full Refund: Rs. {order.refund.refundedAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-gray-500 block">Total Amount</span>
                      <span className="text-base font-extrabold text-emerald-950">
                        Rs. {order.pricing.total.toLocaleString()}
                      </span>
                    </div>

                    {/* Cancel & Refund Button (Enabled for PAID orders) */}
                    {isPaid && (
                      <button
                        onClick={() => setSelectedOrderToCancel(order)}
                        disabled={isCancelling}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Order & Refund</span>
                      </button>
                    )}

                    {isRefunded && (
                      <div className="text-[11px] text-gray-400 font-medium italic">
                        Restocked to inventory on {new Date(order.refund?.refundedAt || order.updatedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-emerald-100 bg-emerald-50/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Close Order History
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal for Cancellation */}
      {selectedOrderToCancel && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">
                Cancel Order & Issue Full Refund?
              </h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to cancel order <strong>{selectedOrderToCancel.id}</strong>?
              </p>
            </div>

            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-xs space-y-1.5 text-rose-900">
              <div className="flex justify-between font-bold">
                <span>Refund Amount:</span>
                <span>Rs. {selectedOrderToCancel.pricing.total.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                A mock credit will be issued to your payment card, and all reserved items will be automatically restored to the store warehouse.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Cancellation
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Customer changed mind">Customer changed mind</option>
                <option value="Ordered wrong item">Ordered wrong item</option>
                <option value="Found alternative">Found alternative product</option>
                <option value="Testing simulation refund">Testing payment gateway refund</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSelectedOrderToCancel(null)}
                className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancellingOrderId === selectedOrderToCancel.id}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                {cancellingOrderId === selectedOrderToCancel.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Confirm Refund</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
