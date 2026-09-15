// Product card display with stock indicator and add to cart action

import React from 'react';
import { Star, Plus, Eye, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ProductCard({ product, onSelectProduct, onAddToCart }) {
  const isOutOfStock = product.availableStock <= 0;
  const isLowStock = product.availableStock > 0 && product.availableStock <= 5;

  return (
    <div className="group bg-white rounded-2xl border border-emerald-100 hover:border-emerald-300 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Product Image Container */}
      <div className="relative aspect-4/3 bg-emerald-50/50 overflow-hidden cursor-pointer" onClick={() => onSelectProduct(product)}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badge (e.g. Bestseller, Eco Friendly) */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
            {product.badge}
          </span>
        )}

        {/* Quick View Button overlay on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectProduct(product);
          }}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-emerald-600 text-gray-700 hover:text-white p-2 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0"
          title="Quick View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-emerald-700 font-medium tracking-wide uppercase text-[11px]">
              {product.category}
            </span>
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-gray-700">{product.rating}</span>
              <span className="text-gray-400 font-normal">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelectProduct(product)}
            className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {product.name}
          </h3>
        </div>

        {/* Price & Stock status */}
        <div className="pt-2 border-t border-emerald-50 flex items-end justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="text-lg font-bold text-emerald-900">
              Rs. {product.price.toLocaleString()}
            </div>

            {/* Stock indicator badge */}
            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium">
              {isOutOfStock ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Out of stock
                </span>
              ) : isLowStock ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Only {product.availableStock} left!
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {product.availableStock} in stock
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shadow-2xs ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-emerald-700/10'
            }`}
            title={isOutOfStock ? 'Sold out' : 'Add to cart'}
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
