// Filter sidebar for price range, stock availability, and sorting

import React from 'react';
import { SlidersHorizontal, RotateCcw, ShieldCheck, Check } from 'lucide-react';

export default function FilterSidebar({
  maxPrice,
  setMaxPrice,
  inStockOnly,
  setInStockOnly,
  sortBy,
  setSortBy,
  onReset,
  totalResultsCount,
}) {
  return (
    <aside className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-4 border-b border-emerald-50">
        <div className="flex items-center gap-2 text-emerald-950 font-semibold text-base">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span>Filters & Sort</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <label htmlFor="sort-select" className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
          Sort By
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full bg-emerald-50/40 border border-emerald-200 text-emerald-950 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
        >
          <option value="featured">Featured / Best Matches</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Highest Customer Rating</option>
        </select>
      </div>

      {/* Price Range Slider (in Sri Lanka Rupees) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Max Price
          </span>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            Rs. {maxPrice.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min="1500"
          max="20000"
          step="500"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-100 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
          <span>Rs. 1,500</span>
          <span>Rs. 20,000+</span>
        </div>
      </div>

      {/* In-Stock Toggle */}
      <div className="pt-3 border-t border-emerald-50">
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-900 block">
              In Stock Only
            </span>
            <span className="text-xs text-gray-500 block">
              Hide out of stock items
            </span>
          </div>
          <div
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
              inStockOnly ? 'bg-emerald-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                inStockOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Trust & Stock Reservation Info Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-xl p-4 border border-emerald-100 text-xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-900 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Stock Reservation Guarantee</span>
        </div>
        <p className="text-emerald-800/80 leading-relaxed text-[11.5px]">
          When you enter checkout, Serendib Green locks your selected items for <strong>10 minutes</strong>. No one else can purchase your held inventory while you complete payment.
        </p>
      </div>

      <div className="text-xs text-gray-400 text-center font-medium">
        Showing <strong>{totalResultsCount}</strong> products
      </div>
    </aside>
  );
}
