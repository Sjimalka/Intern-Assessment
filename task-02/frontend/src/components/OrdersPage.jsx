// Orders page showing past orders, receipts, and refund requests

import React, { useState } from 'react';
import {
  Package,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  MapPin
} from 'lucide-react';

export default function OrdersPage({
  orders,
  isLoading,
  onCancelOrder,
  cancellingOrderId,
  onRefreshOrders,
  onNavigateToShop,
}) {
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Customer changed mind');
  const [refundAlert, setRefundAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'REFUNDED'

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

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    return order.status === statusFilter;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
        <div>
          <button
            type="button"
            onClick={onNavigateToShop}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
            My Orders & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track past purchases, view payment receipts, or initiate cancellations and refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshOrders}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToShop}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Shop More</span>
          </button>
        </div>
      </div>

      {/* Refund Success Banner if an order was just refunded */}
      {refundAlert && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <span className="font-bold block">Refund Processed & Stock Restored!</span>
            <p className="text-emerald-800/90 text-xs">{refundAlert}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefundAlert(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs (All / Paid / Refunded) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('PAID')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'PAID'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Paid & Confirmed ({orders.filter(o => o.status === 'PAID').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('REFUNDED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            statusFilter === 'REFUNDED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Refunded ({orders.filter(o => o.status === 'REFUNDED').length})
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-500 space-y-3 bg-white rounded-3xl border border-emerald-100 p-8 shadow-xs">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading your past orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-emerald-100 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No orders found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {statusFilter === 'ALL'
                ? 'You haven’t placed any orders yet. Explore our artisanal Ceylon teas and handicrafts to test the shopping and mock payment experience!'
                : `No orders matching status "${statusFilter}".`}
            </p>
            <button
              type="button"
              onClick={onNavigateToShop}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPaid = order.status === 'PAID';
            const isRefunded = order.status === 'REFUNDED';
            const isCancelling = cancellingOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-emerald-100 hover:border-emerald-200 shadow-xs p-5 sm:p-6 space-y-4 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900 text-base">
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
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Paid & Confirmed
                      </span>
                    )}
                    {isRefunded && (
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 text-xs">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        Refunded & Restocked
                      </span>
                    )}
                  </div>
                </div>

                {/* Purchased items list */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Items Purchased
                  </span>
                  <div className="space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs sm:text-sm text-gray-700 py-1 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                            {item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">{item.name}</span>
                        </div>
                        <span className="font-bold text-emerald-950">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery & Payment details box */}
                <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100/70 text-xs space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center text-gray-600 gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Recipient: <strong>{order.customer?.fullName}</strong> ({order.customer?.address}, {order.customer?.city})
                    </span>
                    <span>
                      Transaction: <strong className="font-mono text-gray-900">{order.payment?.transactionId || 'N/A'}</strong>
                    </span>
                  </div>

                  {isRefunded && order.refund && (
                    <div className="pt-2 border-t border-emerald-100 flex flex-wrap justify-between items-center text-purple-900 font-semibold text-xs gap-2">
                      <span>Refund Reference: <strong className="font-mono">{order.refund.refundId}</strong></span>
                      <span>Full Refund: Rs. {Number(order.refund.refundedAmount).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action & Total Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-gray-500 block">Total Amount</span>
                    <span className="text-lg sm:text-xl font-extrabold text-emerald-950">
                      Rs. {Number(order.pricing?.total || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Cancel Order & Refund Button (Active for PAID orders) */}
                  {isPaid && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderToCancel(order)}
                      disabled={isCancelling}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cancel Order & Refund</span>
                    </button>
                  )}

                  {isRefunded && (
                    <div className="text-xs text-gray-500 font-medium italic">
                      Items were restocked to warehouse inventory.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Sub-Modal for Cancellation */}
      {selectedOrderToCancel && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
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
                <span>Rs. {Number(selectedOrderToCancel.pricing?.total || 0).toLocaleString()}</span>
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
                type="button"
                onClick={() => setSelectedOrderToCancel(null)}
                className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancellingOrderId === selectedOrderToCancel.id}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
