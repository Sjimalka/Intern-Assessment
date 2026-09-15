import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, AlertTriangle, Layers, Tag } from 'lucide-react';
import { formatLKR } from '../utils/currency';

export default function ProductCatalog({ products = [], cart = [], onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // get list of categories
  const categories = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const set = new Set(list.map(p => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // filter products based on search and category
  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // count how many of this item are in the cart
  const getCartQuantity = (productId) => {
    const list = Array.isArray(cart) ? cart : [];
    const item = list.find(c => c.productId === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* search and category filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-4 sm:mb-6 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all shadow-xs"
          />
        </div>

        {/* category buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 max-w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900 hover:border-neutral-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* products cards */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-2xl border border-neutral-200 text-center shadow-xs">
          <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-300 mb-3" />
          <p className="text-neutral-800 font-semibold text-sm sm:text-base">No products found</p>
          <p className="text-neutral-500 text-xs mt-1">Try adjusting your search terms or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 auto-rows-fr">
          {filteredProducts.map(product => {
            const inCart = getCartQuantity(product.id);
            const remainingSellable = Math.max(0, product.available_stock - inCart);
            const isOutOfStock = product.available_stock <= 0;
            const isMaxInCart = !isOutOfStock && remainingSellable === 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-neutral-200 hover:border-neutral-900 transition-all duration-200 flex flex-col overflow-hidden group shadow-xs hover:shadow-md"
              >
                {/* image and badges */}
                <div className="relative h-40 sm:h-44 bg-neutral-100 overflow-hidden">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

                  {/* category tag */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-white/95 backdrop-blur-md text-neutral-900 border border-neutral-200 shadow-xs flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />
                      {product.category}
                    </span>
                  </div>

                  {/* stock badge */}
                  <div className="absolute top-3 right-3">
                    {isOutOfStock ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-950 text-white shadow-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400" /> Out of Stock
                      </span>
                    ) : product.available_stock <= 3 ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-neutral-900 border border-neutral-900 shadow-md flex items-center gap-1 animate-pulse">
                        Only {product.available_stock} left!
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-neutral-900 text-white shadow-md">
                        In Stock ({product.available_stock})
                      </span>
                    )}
                  </div>
                </div>

                {/* product details */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <h3 className="font-bold text-neutral-950 text-xs sm:text-sm leading-snug line-clamp-2 mb-1" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-mono text-neutral-500 mb-2.5 sm:mb-3">SKU: {product.sku}</p>

                    {/* stock numbers */}
                    <div className="bg-neutral-50 p-2 sm:p-2.5 rounded-xl border border-neutral-200 mb-3 sm:mb-4 grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                      <div>
                        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500">Available</div>
                        <div className={`text-xs font-black mt-0.5 ${product.available_stock > 0 ? 'text-neutral-950' : 'text-red-600'}`}>
                          {product.available_stock}
                        </div>
                      </div>
                      <div className="border-x border-neutral-200">
                        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500">In Checkout</div>
                        <div className="text-xs font-black text-amber-600 mt-0.5">
                          {product.reserved_stock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-neutral-500">Total</div>
                        <div className="text-xs font-black text-neutral-700 mt-0.5">
                          {product.total_stock}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* price and add to cart button */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-neutral-100 gap-2">
                    <div>
                      <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-neutral-500 block">Price</span>
                      <div className="text-sm sm:text-base font-extrabold text-neutral-950 font-mono tracking-tight">
                        {formatLKR(product.price)}
                      </div>
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      disabled={isOutOfStock || isMaxInCart}
                      className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px] ${
                        isOutOfStock
                          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                          : isMaxInCart
                          ? 'bg-neutral-100 text-neutral-700 border border-neutral-300 cursor-not-allowed'
                          : inCart > 0
                          ? 'bg-neutral-900 hover:bg-black text-white shadow-sm active:scale-95'
                          : 'bg-neutral-900 hover:bg-black text-white active:scale-95'
                      }`}
                    >
                      {inCart > 0 ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Cart ({inCart})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
