import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle, 
  PackagePlus, 
  Search, 
  Boxes,
  UploadCloud,
  ImagePlus
} from 'lucide-react';
import { formatLKR } from '../utils/currency';

export default function InventoryManager({ 
  products = [], 
  onCreateProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  isLoading 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    price: '',
    total_stock: '',
    image_url: ''
  });
  const [error, setError] = useState(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const filteredProducts = safeProducts.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      category: 'Electronics',
      price: '15000',
      total_stock: '10',
      image_url: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  // pick a picture from computer
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // resize image so it stays small and loads fast
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, image_url: dataUrl }));
        setError(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      total_stock: product.total_stock.toString(),
      image_url: product.image_url || ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.sku || !formData.price || !formData.total_stock) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          price: parseFloat(formData.price),
          total_stock: parseInt(formData.total_stock, 10),
          image_url: formData.image_url
        });
      } else {
        await onCreateProduct({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          price: parseFloat(formData.price),
          total_stock: parseInt(formData.total_stock, 10),
          image_url: formData.image_url
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save product');
    }
  };

  // add extra stock to product
  const handleQuickRestock = async (product, amount) => {
    try {
      await onUpdateProduct(product.id, {
        total_stock: product.total_stock + amount
      });
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Header Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Products</div>
            <div className="text-xl font-extrabold text-neutral-950 mt-0.5">{products.length}</div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Currently Reserved Stock</div>
            <div className="text-xl font-extrabold text-amber-700 mt-0.5">
              {products.reduce((acc, p) => acc + p.reserved_stock, 0)} units
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Sellable Inventory</div>
            <div className="text-xl font-extrabold text-neutral-950 mt-0.5">
              {products.reduce((acc, p) => acc + p.available_stock, 0)} units
            </div>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search inventory by title, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[40px] w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* mobile card list */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-400">
            <Boxes className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-700 text-sm">No products found</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-neutral-200 p-3.5 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <img
                  src={product.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'}
                  alt={product.name}
                  className="w-14 h-14 rounded-xl object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase bg-neutral-100 px-2 py-0.5 rounded">{product.category}</span>
                    <span className="font-mono font-extrabold text-xs text-neutral-950">{formatLKR(product.price)}</span>
                  </div>
                  <h4 className="font-bold text-xs text-neutral-950 mt-1 line-clamp-1">{product.name}</h4>
                  <p className="text-[10px] font-mono text-neutral-400">SKU: {product.sku}</p>
                </div>
              </div>

              {/* stock numbers row */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-50 p-2 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">Total</span>
                  <span className="font-bold text-neutral-800">{product.total_stock}</span>
                </div>
                <div className="border-x border-neutral-200">
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">Reserved</span>
                  <span className={`font-bold ${product.reserved_stock > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>{product.reserved_stock}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">Available</span>
                  <span className={`font-bold ${product.available_stock > 0 ? 'text-neutral-950 font-black' : 'text-red-600'}`}>{product.available_stock}</span>
                </div>
              </div>

              {/* quick restock + actions */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">Restock:</span>
                  <button
                    onClick={() => handleQuickRestock(product, 5)}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer min-h-[30px]"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handleQuickRestock(product, 20)}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer min-h-[30px]"
                  >
                    +20
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 transition-colors shadow-2xs cursor-pointer"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    disabled={product.reserved_stock > 0}
                    className="p-2 rounded-xl bg-white hover:bg-red-50 text-neutral-500 hover:text-red-700 border border-neutral-300 disabled:opacity-30 cursor-pointer shadow-2xs transition-colors"
                    title={product.reserved_stock > 0 ? "Cannot delete while stock is reserved in checkout" : "Delete Product"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* desktop products table */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase tracking-wider font-bold">
                <th className="p-4">Product Info</th>
                <th className="p-4">SKU / Category</th>
                <th className="p-4">Unit Price (LKR)</th>
                <th className="p-4 text-center">Physical Total</th>
                <th className="p-4 text-center">In Checkout</th>
                <th className="p-4 text-center">Available</th>
                <th className="p-4">Quick Restock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60'}
                        alt={product.name}
                        className="w-9 h-9 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div>
                        <div className="font-bold text-neutral-950 text-xs line-clamp-1">{product.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">ID: {product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono font-medium text-neutral-800">{product.sku}</div>
                    <div className="text-[10px] text-neutral-500 font-semibold">{product.category}</div>
                  </td>
                  <td className="p-4 font-mono font-extrabold text-neutral-950">
                    {formatLKR(product.price)}
                  </td>
                  <td className="p-4 text-center font-bold text-neutral-700">
                    {product.total_stock}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      product.reserved_stock > 0 
                        ? 'bg-amber-50 text-amber-800 border border-amber-300' 
                        : 'text-neutral-400'
                    }`}>
                      {product.reserved_stock}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      product.available_stock > 0 
                        ? 'bg-neutral-900 text-white' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {product.available_stock}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickRestock(product, 5)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleQuickRestock(product, 20)}
                        className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer"
                      >
                        +20
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-700 hover:text-black border border-neutral-300 transition-colors cursor-pointer shadow-2xs"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product.id)}
                        disabled={product.reserved_stock > 0}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-neutral-500 hover:text-red-700 border border-neutral-300 hover:border-red-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                        title={product.reserved_stock > 0 ? "Cannot delete while stock is reserved in checkout" : "Delete Product"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* add or edit product popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-neutral-300 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3.5 sm:p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-extrabold text-sm text-neutral-950">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-neutral-200/70 hover:bg-neutral-300 text-neutral-600 hover:text-black flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-xs bg-white overflow-y-auto flex-1">
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-neutral-700 block mb-1 font-bold">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-700 block mb-1 font-bold">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-900 font-mono placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 block mb-1 font-bold">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-700 block mb-1 font-bold">Unit Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-900 font-mono placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-neutral-700 block mb-1 font-bold">Total Physical Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.total_stock}
                    onChange={(e) => setFormData({ ...formData, total_stock: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-neutral-900 font-mono placeholder-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-700 block mb-1.5 font-bold">Product Picture</label>
                {formData.image_url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-neutral-300 bg-neutral-50 p-2.5 flex items-center gap-3 shadow-2xs">
                    <img
                      src={formData.image_url}
                      alt="Product preview"
                      className="w-16 h-16 rounded-xl object-cover bg-white border border-neutral-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-neutral-950 flex items-center gap-1">
                        <span>Picture Loaded</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">Stored from your computer</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <label className="cursor-pointer text-[11px] font-bold text-neutral-900 hover:underline inline-flex items-center gap-1">
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileChange}
                          />
                        </label>
                        <span className="text-neutral-300">•</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-neutral-50 hover:bg-neutral-100/80 transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 group-hover:text-black group-hover:scale-105 transition-all shadow-2xs">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-neutral-900 block">
                        Click to upload picture from computer
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        PNG, JPG, JPEG, WEBP (stored directly in catalog)
                      </span>
                    </div>
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 font-semibold border border-neutral-300 transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-neutral-950 hover:bg-black text-white font-bold transition-colors cursor-pointer shadow-sm"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
