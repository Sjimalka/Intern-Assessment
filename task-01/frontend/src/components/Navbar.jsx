import React from 'react';
import { 
  ShoppingBag, 
  Layers, 
  FileText, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  ClipboardList 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onResetData, isResetting, cartCount, onOpenMobileCart }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* logo and store name */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-md shadow-neutral-900/10 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-neutral-950 tracking-tight">ApexPOS</span>
              </div>
              <p className="text-[10px] sm:text-xs text-neutral-500 font-medium">Inventory Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => {
                setActiveTab('pos');
                if (onOpenMobileCart) onOpenMobileCart();
              }}
              className="relative p-2 rounded-xl bg-neutral-900 hover:bg-black text-white active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              title="Open Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-bold">Cart</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-neutral-950 text-[10px] font-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* navigation tabs */}
        <nav className="flex items-center gap-1 p-1 bg-neutral-100/90 rounded-xl border border-neutral-200 overflow-x-auto scrollbar-none w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'pos'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Products</span>
            {cartCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'pos' ? 'bg-white text-neutral-950' : 'bg-neutral-300 text-neutral-900'
              }`}>
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Stock & Products</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Order Trail</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
