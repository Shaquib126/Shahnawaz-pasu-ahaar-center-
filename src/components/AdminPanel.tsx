import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Category } from '../types';
import { Plus, Trash2, ShieldCheck, X, Edit2 } from 'lucide-react';

export function AdminPanel() {
  const { products, addProduct, updateProduct, deleteProduct, t } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Feed' as Category,
    description: '',
    price: '',
    stock: '',
    imageUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock) return;
    
    const productPayload = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      price: Number(formData.price),
      stock: Number(formData.stock),
      imageUrl: formData.imageUrl,
      ...(editingId ? { icon: products.find(p => p.id === editingId)?.icon } : {})
    };

    if (editingId) {
      updateProduct(editingId, productPayload);
    } else {
      addProduct(productPayload);
    }
    
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ name: '', category: 'Feed', description: '', price: '', stock: '', imageUrl: '' });
  };

  const handleEdit = (product: any) => {
    setFormData({
      name: product.name,
      category: product.category as Category,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl || ''
    });
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-[#2D5A27] p-2.5 rounded-xl shadow-sm">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin_panel')}</h1>
        </div>
        <button
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            if (isFormOpen) {
              setEditingId(null);
              setFormData({ name: '', category: 'Feed', description: '', price: '', stock: '', imageUrl: '' });
            }
          }}
          className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-medium px-5 py-2.5 rounded-lg transition-all flex items-center space-x-2 shadow-sm hover:shadow active:scale-95"
        >
          {isFormOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          <span>{isFormOpen ? t('close') : t('add_product')}</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8 mb-8 animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">{editingId ? t('edit' as any) : t('add_product')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('name')}</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('category')}</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all">
                <option value="Feed">{t('feed')}</option>
                <option value="Medicine">{t('medicine')}</option>
                <option value="Appetite">{t('appetite')}</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">{t('description')}</label>
              <textarea required rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('price')}</label>
              <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">{t('stock')}</label>
              <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">{t('image_url' as any)}</label>
              <input type="url" placeholder="https://example.com/image.jpg" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>
            
            <div className="md:col-span-2 flex justify-end pt-4 mt-2 border-t border-gray-100">
              <button type="submit" className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors">
                {t('save_product' as any)}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-[#E1E8DE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7F2] text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('name')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('category')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('price')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('stock')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE] text-right">{t('actions' as any)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E8DE]">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-[#F9FBF8] transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-bold text-gray-900 mb-0.5">{product.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-xs">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#E9F0E6] text-[#2D5A27] uppercase tracking-wider">
                      {t(product.category.toLowerCase() as any)}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-gray-900 text-lg">₹{product.price}</td>
                  <td className="p-5">
                    <span className={`font-black text-lg ${product.stock > 0 ? 'text-gray-900' : 'text-red-500'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-5 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 inline-flex mr-1"
                      title={t('edit' as any)}
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => {
                        window.confirm('Delete this product?') && deleteProduct(product.id);
                      }}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 inline-flex"
                      title={t('delete')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="p-16 text-center text-gray-500">
              No products found. Add some from the button above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
