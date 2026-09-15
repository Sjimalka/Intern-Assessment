import React from 'react';
import { ClipboardList, RefreshCw, Layers } from 'lucide-react';

export default function AuditLogView({ logs = [], onRefresh, isLoading }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  // badge color based on stock action
  const getActionBadge = (action) => {
    switch (action) {
      case 'RESERVE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            RESERVE
          </span>
        );
      case 'RELEASE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
            RELEASE
          </span>
        );
      case 'DEDUCT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-950 text-white">
            DEDUCT (PAID)
          </span>
        );
      case 'RESTOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-400">
            RESTOCK
          </span>
        );
      case 'CREATE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-900 text-white">
            CREATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            DELETE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* header with responsive refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-neutral-950 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-neutral-950" />
            Inventory Audit Trail
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            Real-time ledger of every stock reservation, deduction, release, and restock.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 transition-colors cursor-pointer shadow-2xs min-h-[38px] w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* mobile card list */}
      <div className="md:hidden space-y-3">
        {safeLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-400">
            <Layers className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-700 text-sm">Audit log is empty</p>
          </div>
        ) : (
          safeLogs.map(log => (
            <div key={log.id} className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getActionBadge(log.action)}
                  <span className="font-bold text-xs text-neutral-900">{log.product_name}</span>
                </div>
                <span className="text-[10px] text-neutral-400 shrink-0 font-sans">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* quick numbers */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2.5 rounded-xl text-center border border-neutral-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Change</span>
                  <span className={`text-xs font-mono font-black ${
                    log.quantity_change > 0 ? 'text-neutral-950' : log.quantity_change < 0 ? 'text-red-600' : 'text-neutral-500'
                  }`}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total</span>
                  <span className="text-xs font-mono font-bold text-neutral-800">{log.new_total_stock}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Reserved</span>
                  <span className="text-xs font-mono font-bold text-amber-700">{log.new_reserved_stock}</span>
                </div>
              </div>

              {/* reason notes */}
              {(log.reason || log.reference_id) && (
                <div className="pt-1 text-[11px] text-neutral-600 border-t border-neutral-100 flex flex-col gap-0.5">
                  {log.reason && <span className="font-medium text-neutral-800">{log.reason}</span>}
                  {log.reference_id && <span className="text-[10px] text-neutral-400 font-mono">{log.reference_id}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* desktop table view */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        {safeLogs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="font-bold text-neutral-700">Audit log is empty</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase tracking-wider font-bold">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4 text-center">Qty Change</th>
                  <th className="p-4 text-center">Total Stock</th>
                  <th className="p-4 text-center">Reserved Stock</th>
                  <th className="p-4">Reference / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono">
                {safeLogs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="p-4 text-neutral-500 font-sans">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-4 font-sans">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-4 font-sans font-bold text-neutral-900">
                      {log.product_name}
                    </td>
                    <td className="p-4 text-center font-bold">
                      <span className={log.quantity_change > 0 ? 'text-neutral-950 font-black' : log.quantity_change < 0 ? 'text-red-600 font-black' : 'text-neutral-500'}>
                        {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                      </span>
                    </td>
                    <td className="p-4 text-center text-neutral-800 font-bold">
                      {log.new_total_stock}
                    </td>
                    <td className="p-4 text-center text-amber-700 font-bold">
                      {log.new_reserved_stock}
                    </td>
                    <td className="p-4 font-sans text-neutral-600">
                      <div className="text-neutral-900 text-xs font-medium">{log.reason || 'Inventory operation'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{log.reference_id}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
