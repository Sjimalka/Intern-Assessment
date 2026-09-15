import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  Search, 
  Receipt, 
  Eye, 
  X 
} from 'lucide-react';
import { formatLKR } from '../utils/currency';

export default function OrdersView({ 
  orders = [], 
  onRefresh, 
  onResumeCheckout, 
  onCancelOrder, 
  onExpireOrder 
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const statuses = ['ALL', 'RESERVED', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED'];

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter(ord => {
    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const matchesSearch = 
      (ord.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status, remainingSeconds) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-950 text-white border border-neutral-950 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Paid
          </span>
        );
      case 'RESERVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5 text-amber-700" /> Reserved ({remainingSeconds > 0 ? `${Math.floor(remainingSeconds/60)}m ${remainingSeconds%60}s` : 'Expiring'})
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Failed
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300 flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5 text-neutral-500" /> Expired
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5 text-neutral-500" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-900 border border-neutral-300 w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* search and status filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders by number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 max-w-full">
          {statuses.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                statusFilter === st
                  ? 'bg-neutral-950 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-950 hover:border-neutral-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* mobile orders card list */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-neutral-200 text-center text-neutral-400">
            <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-700 text-sm">No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-xs text-neutral-950 block">#{order.order_number}</span>
                  <span className="text-[11px] text-neutral-500 font-medium">{order.customer_name || 'Counter Guest'}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-sm text-neutral-950 block">{formatLKR(order.total_amount)}</span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                <div>{getStatusBadge(order.status, order.remainingSeconds)}</div>
                <span className="text-[11px] text-neutral-500">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                {order.status === 'RESERVED' && (
                  <>
                    <button
                      onClick={() => onResumeCheckout(order)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer min-h-[32px]"
                    >
                      <span>Checkout</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onExpireOrder(order.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-300 transition-colors cursor-pointer min-h-[32px]"
                    >
                      Expire
                    </button>

                    <button
                      onClick={() => onCancelOrder(order.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-neutral-600 hover:text-red-700 text-xs font-semibold border border-neutral-300 transition-colors cursor-pointer min-h-[32px]"
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer min-h-[32px] shadow-2xs"
                >
                  <Eye className="w-3 h-3" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* desktop orders table */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="font-bold text-neutral-700">No orders found</p>
            <p className="text-xs text-neutral-400 mt-1">There are no orders matching your current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase tracking-wider font-bold">
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-neutral-950">
                      {order.order_number}
                    </td>
                    <td className="p-4 text-neutral-700 font-medium">
                      {order.customer_name || 'Counter Guest'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status, order.remainingSeconds)}
                    </td>
                    <td className="p-4 text-neutral-500 font-medium">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="p-4 font-mono font-extrabold text-neutral-950">
                      {formatLKR(order.total_amount)}
                    </td>
                    <td className="p-4 text-neutral-500">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'RESERVED' && (
                          <>
                            <button
                              onClick={() => onResumeCheckout(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <span>Checkout</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => onExpireOrder(order.id)}
                              title="Test immediate 5-min expiration"
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-300 transition-colors cursor-pointer shadow-2xs"
                            >
                              Expire
                            </button>

                            <button
                              onClick={() => onCancelOrder(order.id)}
                              title="Cancel reservation & release stock"
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-neutral-600 hover:text-red-700 text-xs font-semibold border border-neutral-300 hover:border-red-200 transition-colors cursor-pointer shadow-2xs"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* order details popup */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3.5 sm:p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-neutral-900" />
                <h3 className="font-extrabold text-xs sm:text-sm text-neutral-950">Order Receipt #{selectedOrder.order_number}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-lg bg-neutral-200/70 hover:bg-neutral-300 text-neutral-600 hover:text-black flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs bg-white">
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200">
                <div>
                  <span className="text-neutral-500 font-bold block text-[11px] uppercase">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status, selectedOrder.remainingSeconds)}</div>
                </div>
                <div>
                  <span className="text-neutral-500 font-bold block text-[11px] uppercase">Customer</span>
                  <div className="font-bold text-neutral-950 mt-1">{selectedOrder.customer_name || 'Counter Guest'}</div>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 font-bold uppercase tracking-wider block mb-2 text-[11px]">Purchased Items</span>
                <div className="bg-neutral-50 rounded-2xl border border-neutral-200 divide-y divide-neutral-200 p-3.5 max-h-48 overflow-y-auto">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-neutral-950">{item.product_name}</div>
                        <div className="text-neutral-500 font-mono">{formatLKR(item.unit_price)} x {item.quantity}</div>
                      </div>
                      <div className="font-mono font-bold text-neutral-950">
                        {formatLKR(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-sm font-bold text-neutral-950">
                <span>Total Amount</span>
                <span className="text-neutral-950 font-mono text-lg font-black">{formatLKR(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-neutral-950 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
