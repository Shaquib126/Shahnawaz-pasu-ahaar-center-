import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Category, Product } from '../types';
import { Wheat, FlaskConical, Leaf, Pill, Activity, Plus, X, ZoomIn, Search } from 'lucide-react';

const CATEGORIES: { id: Category | 'All', labelKey: string }[] = [
  { id: 'All', labelKey: 'all' },
  { id: 'Feed', labelKey: 'feed' },
  { id: 'Medicine', labelKey: 'medicine' },
  { id: 'Appetite', labelKey: 'appetite' }
];

export function Shop() {
  const { products, addToCart, t, language } = useStore();
  const [activeTab, setActiveTab] = useState<Category | 'All'>('All');
  const [zoomedProduct, setZoomedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeTab === 'All' || p.category === activeTab;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const matchesSearch = !normalizedQuery || 
      p.name.toLowerCase().includes(normalizedQuery) || 
      p.description.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide py-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-5 sm:px-6 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${
                activeTab === cat.id 
                  ? 'bg-[#2D5A27] text-white shadow-md' 
                  : 'bg-white text-[#2D5A27] border border-[#DCE4D8] hover:bg-[#F0F4EF]'
              }`}
            >
              {t(cat.labelKey as any)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-4.5 h-4.5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder={t('search_placeholder' as any)}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#DCE4D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A27] focus:border-transparent text-sm transition-all shadow-sm text-gray-800 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white rounded-2xl border border-[#E1E8DE] p-4 flex flex-col gap-3 shadow-sm transition-all duration-300 ${product.stock === 0 ? 'opacity-75 grayscale' : ''}`}>
            {/* Placeholder Image Area */}
            <div 
              onClick={() => setZoomedProduct(product)}
              className={`w-full h-32 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer group select-none ${product.stock === 0 ? 'bg-[#F0F0F0]' : 'bg-[#E9F0E6]'}`}
              title="Click to view larger image"
            >
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${product.stock === 0 ? 'opacity-70 grayscale' : ''}`} />
              ) : (
                <IconMapper name={product.icon || getIconForCategory(product.category)} className={`w-12 h-12 transition-transform duration-300 group-hover:scale-110 ${product.stock === 0 ? 'text-gray-300' : 'text-[#A5C09D]'}`} />
              )}
              
              {/* Hover Indicator overlay */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/90 p-1.5 rounded-full shadow-sm text-[#2D5A27]">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>

              {product.stock === 0 && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 font-bold rounded uppercase shadow-sm">
                  {t('out_of_stock')}
                </span>
              )}
              {product.stock > 0 && product.stock < 5 && (
                <span className="absolute top-2 left-2 bg-amber-600 text-white text-[10px] px-2.5 py-0.5 font-bold rounded uppercase shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Only {product.stock} Left!
                </span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col bg-white z-10 relative mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${product.stock === 0 ? 'text-gray-400' : 'text-[#2D5A27]'}`}>
                {t(product.category.toLowerCase() as any)}
              </span>
              <h3 className={`text-lg font-bold mb-1 line-clamp-2 leading-tight ${product.stock === 0 ? 'text-gray-500' : 'text-gray-900'}`} title={product.name}>
                {product.name}
              </h3>
              <p className={`text-xs flex-1 line-clamp-3 mb-4 leading-relaxed ${product.stock === 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                {product.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className={`text-xl font-bold flex items-baseline ${product.stock === 0 ? 'text-gray-400' : 'text-[#2D5A27]'}`}>
                  ₹{product.price}
                </span>
                
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0}
                  className={`px-4 flex items-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                    product.stock > 0 
                      ? 'bg-[#2D5A27] text-white hover:bg-[#23471E] active:scale-95' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {product.stock > 0 ? (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{t('add_to_cart')}</span>
                      </>
                  ) : t('out_of_stock')}
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Leaf className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-lg">
              {searchQuery ? t('no_results_found' as any) : (language === 'hi' ? 'इस श्रेणी में कोई उत्पाद नहीं मिला।' : 'No products found in this category.')}
            </p>
          </div>
        )}
      </div>

      {/* Larger Image Preview Modal */}
      {zoomedProduct && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedProduct(null)}
        >
          <div 
            className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-[#E1E8DE] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setZoomedProduct(null)}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all z-10 hover:rotate-90 duration-200"
              title="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Premium Header Accent */}
            <div className="w-full h-1.5 bg-[#2D5A27]" />

            {/* Display Image Area */}
            <div className={`w-full h-64 sm:h-80 flex items-center justify-center relative bg-[#E9F0E6] overflow-hidden`}>
              {zoomedProduct.imageUrl ? (
                <img 
                  src={zoomedProduct.imageUrl} 
                  alt={zoomedProduct.name} 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <IconMapper 
                    name={zoomedProduct.icon || getIconForCategory(zoomedProduct.category)} 
                    className="w-24 h-24 text-[#A5C09D]" 
                  />
                  <span className="text-xs text-gray-400 font-mono">No product image available</span>
                </div>
              )}

              {zoomedProduct.stock === 0 ? (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs px-3 py-1 font-bold rounded uppercase shadow-md">
                  {t('out_of_stock')}
                </span>
              ) : zoomedProduct.stock < 5 ? (
                <span className="absolute top-4 left-4 bg-amber-600 text-white text-xs px-3 py-1 font-bold rounded uppercase shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Only {zoomedProduct.stock} items left!
                </span>
              ) : null}
            </div>

            {/* Full Details Panel */}
            <div className="p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2D5A27] bg-[#E9F0E6] px-2.5 py-1 rounded-md">
                {t(zoomedProduct.category.toLowerCase() as any)}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-3 text-gray-900 leading-snug">
                {zoomedProduct.name}
              </h2>
              <p className="text-sm text-gray-600 mt-2.5 leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto pr-1">
                {zoomedProduct.description}
              </p>

              <div className="flex items-center justify-between border-t border-gray-100 pt-5 mt-5">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider block">Price</span>
                  <span className="text-2xl font-bold text-[#2D5A27] flex items-baseline">
                    ₹{zoomedProduct.price}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      addToCart(zoomedProduct.id);
                      setZoomedProduct(null);
                    }}
                    disabled={zoomedProduct.stock === 0}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
                      zoomedProduct.stock > 0 
                        ? 'bg-[#2D5A27] text-white hover:bg-[#23471E] active:scale-95' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {zoomedProduct.stock > 0 ? (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{t('add_to_cart')}</span>
                        </>
                    ) : t('out_of_stock')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getIconForCategory(category: Category): string {
  switch (category) {
    case 'Feed':
      return 'Wheat';
    case 'Medicine':
      return 'Pill';
    case 'Appetite':
      return 'Leaf';
    default:
      return 'Leaf';
  }
}

function IconMapper({ name, className }: { name?: string, className?: string }) {
  const Ico = {
    Wheat,
    FlaskConical,
    Leaf,
    Pill,
    Activity
  }[name || 'Leaf'] || Leaf;
  return <Ico className={className} />;
}
