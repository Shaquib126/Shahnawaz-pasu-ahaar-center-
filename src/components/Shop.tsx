import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Category } from '../types';
import { Wheat, FlaskConical, Leaf, Pill, Activity, Plus } from 'lucide-react';

const CATEGORIES: { id: Category | 'All', labelKey: string }[] = [
  { id: 'All', labelKey: 'all' },
  { id: 'Feed', labelKey: 'feed' },
  { id: 'Medicine', labelKey: 'medicine' },
  { id: 'Appetite', labelKey: 'appetite' }
];

export function Shop() {
  const { products, addToCart, t, language } = useStore();
  const [activeTab, setActiveTab] = useState<Category | 'All'>('All');

  const filteredProducts = activeTab === 'All' 
    ? products 
    : products.filter(p => p.category === activeTab);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Category Tabs */}
      <div className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-2 scrollbar-hide py-1">
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

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className={`bg-white rounded-2xl border border-[#E1E8DE] p-4 flex flex-col gap-3 shadow-sm transition-all duration-300 ${product.stock === 0 ? 'opacity-75 grayscale' : ''}`}>
            {/* Placeholder Image Area */}
            <div className={`w-full h-32 rounded-xl flex items-center justify-center relative overflow-hidden ${product.stock === 0 ? 'bg-[#F0F0F0]' : 'bg-[#E9F0E6]'}`}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className={`w-full h-full object-cover ${product.stock === 0 ? 'opacity-70 grayscale' : ''}`} />
              ) : (
                <IconMapper name={product.icon} className={`w-12 h-12 ${product.stock === 0 ? 'text-gray-300' : 'text-[#A5C09D]'}`} />
              )}
              {product.stock === 0 && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 font-bold rounded uppercase shadow-sm">
                  {t('out_of_stock')}
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
            <p className="text-lg">No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
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
