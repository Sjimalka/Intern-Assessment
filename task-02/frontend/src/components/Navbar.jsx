// Top header navigation and mobile bottom bar

import React from 'react';
import {
  ShoppingBag,
  Clock,
  History,
  Search,
  Sprout,
  ShieldCheck,
  Store
} from 'lucide-react';

export default function Navbar({
  currentPage = 'shop',
  onNavigate,
  searchQuery,
  setSearchQuery,
  cartCount,
  cartTotal,
  ordersCount = 0,
  onOpenCart,
  onOpenCheckout,
  activeReservation,
  reservationSecondsLeft,
}) {
  // Format reservation timer into MM:SS
  const formatTimer = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        {/* Top micro-announcement banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 text-center font-medium flex items-center justify-center gap-1.5 sm:gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="truncate">Islandwide Delivery across Sri Lanka | Free Delivery Over Rs. 5,000</span>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 md:py-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 md:h-20">
            {/* Top Row on Mobile: Logo on Left, Action buttons on Right */}
            <div className="flex items-center justify-between gap-2">
              {/* Brand Logo */}
              <div
                className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0"
                onClick={() => onNavigate('shop')}
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
                  <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 block leading-tight">
                    Serendib<span className="text-emerald-600">Green</span>
                  </span>
                  <span className="hidden sm:block text-[10.5px] sm:text-[11px] font-medium tracking-wider text-emerald-700 uppercase">
                    Pure Ceylon & Artisanal Living
                  </span>
                </div>
              </div>

              {/* Mobile Quick Action Buttons (< md screens) */}
              <div className="flex items-center gap-1.5 md:hidden">
                {/* Active hold timer on mobile */}
                {activeReservation && reservationSecondsLeft > 0 && (
                  <button
                    type="button"
                    onClick={onOpenCheckout}
                    className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-xl text-[11px] font-bold font-mono animate-pulse-soft cursor-pointer"
                    title="Stock hold timer - tap to view checkout"
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{formatTimer(reservationSecondsLeft)}</span>
                  </button>
                )}

                {/* Mobile Cart Button */}
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="relative flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                  aria-label="View Cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="bg-white text-emerald-800 text-[10.5px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-2xs">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="flex-1 w-full md:max-w-md md:mx-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/70" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (currentPage !== 'shop') onNavigate('shop');
                  }}
                  onChange={(e) => {
                    if (currentPage !== 'shop') onNavigate('shop');
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search Ceylon tea, spices, handicrafts, batik..."
                  className="w-full pl-10 pr-8 py-2 sm:py-2.5 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white text-xs sm:text-sm text-gray-900 placeholder-emerald-800/40 rounded-full border border-emerald-200/70 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1 cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Navigation Tabs & Actions */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Shop Page Tab */}
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  currentPage === 'shop'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Shop</span>
              </button>

              {/* My Orders Page Tab */}
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  currentPage === 'orders'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>My Orders</span>
                {ordersCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {ordersCount}
                  </span>
                )}
              </button>

              {/* Desktop Active Stock Hold Timer (if active) */}
              {activeReservation && reservationSecondsLeft > 0 && (
                <button
                  type="button"
                  onClick={onOpenCheckout}
                  className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-amber-100 transition-colors animate-pulse-soft shadow-2xs cursor-pointer"
                  title="Stock hold timer - tap to review checkout"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reserved: <strong className="font-mono text-amber-950">{formatTimer(reservationSecondsLeft)}</strong></span>
                </button>
              )}

              {/* Shopping Cart Button */}
              <button
                type="button"
                onClick={onOpenCart}
                className="relative flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-98 cursor-pointer ml-1"
                aria-label="View Shopping Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{cartCount > 0 ? `Rs. ${cartTotal.toLocaleString()}` : 'Cart'}</span>
                {cartCount > 0 && (
                  <span className="bg-white text-emerald-800 text-[11px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-2xs">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Fixed for phone screens < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-lg py-2 px-6 flex items-center justify-around text-[11px] font-semibold text-gray-600">
        {/* Shop Tab */}
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-colors cursor-pointer ${
            currentPage === 'shop' ? 'text-emerald-700 font-bold' : 'hover:text-emerald-700'
          }`}
        >
          <Store className={`w-5 h-5 ${currentPage === 'shop' ? 'text-emerald-700' : 'text-gray-500'}`} />
          <span>Shop</span>
        </button>

        {/* Orders Tab */}
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className={`relative flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-colors cursor-pointer ${
            currentPage === 'orders' ? 'text-emerald-700 font-bold' : 'hover:text-emerald-700'
          }`}
        >
          <History className={`w-5 h-5 ${currentPage === 'orders' ? 'text-emerald-700' : 'text-gray-500'}`} />
          <span>My Orders</span>
          {ordersCount > 0 && (
            <span className="absolute top-0 right-3 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded-full">
              {ordersCount}
            </span>
          )}
        </button>

        {/* Cart Trigger */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-colors cursor-pointer hover:text-emerald-700"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-gray-500" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>
      </nav>
    </>
  );
}
