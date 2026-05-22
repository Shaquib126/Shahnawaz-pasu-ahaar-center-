import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { Category } from '../types';
import { Plus, Trash2, ShieldCheck, X, Edit2, Package, ListChecks, CheckCircle2, Mail, RefreshCw, Camera } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from '../auth';

export function AdminPanel() {
  const { products, orders, addProduct, updateProduct, deleteProduct, updateOrderStatus, adminProfilePic, setAdminProfilePic, t } = useStore();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'workspace'>('products');
  
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

  const [user, setUser] = useState<any>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  useEffect(() => {
    initAuth(
      (u) => setUser(u),
      () => setUser(null)
    );
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn(true);
      if (res) setUser(res.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        alert("Sign-in popup was closed. Please try again. If you are in a preview window, try opening the app in a new tab.");
      } else {
        alert("Failed to login with Google");
      }
    }
  };

  const handleFetchEmails = async () => {
    const token = await getAccessToken();
    if (!token) return;

    setIsLoadingEmails(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.messages && data.messages.length > 0) {
        const emailDetails = await Promise.all(
          data.messages.map(async (msg: any) => {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return await msgRes.json();
          })
        );
        setEmails(emailDetails);
      } else {
        setEmails([]);
      }
    } catch (err) {
      alert("Failed to sync emails.");
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportOrdersToSheets = async () => {
    const token = await getAccessToken();
    if (!token) return;

    if (!window.confirm(`Export ${orders.length} orders to a new Google Sheet?`)) return;

    setIsExporting(true);
    try {
      // 1. Create a new Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Orders Export ${new Date().toLocaleDateString()}`
          }
        })
      });
      const createData = await createRes.json();
      
      if (!createRes.ok) throw new Error(createData.error?.message || 'Failed to create spreadsheet');
      
      const spreadsheetId = createData.spreadsheetId;
      const spreadsheetUrl = createData.spreadsheetUrl;

      // 2. Prepare order data
      const header = ["Order ID", "Date", "Customer Name", "Customer Phone", "Customer Address", "Total Amount", "Status", "Items (Qty)"];
      const rows = orders.map(order => [
        order.id,
        new Date(order.date).toLocaleString(),
        order.customerInfo.name,
        order.customerInfo.phone,
        order.customerInfo.address,
        order.totalAmount,
        order.status,
        order.items.map(i => `${i.quantity}x ${products.find(p => p.id === i.productId)?.name || 'Unknown'}`).join(", ")
      ]);

      const values = [header, ...rows];

      // 3. Append data to the new Spreadsheet
      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values
        })
      });

      if (!appendRes.ok) {
        const errorData = await appendRes.json();
        throw new Error(errorData.error?.message || 'Failed to append data');
      }

      alert("Successfully exported orders to Google Sheets! Opening the sheet now...");
      window.open(spreadsheetUrl, '_blank');

    } catch (err: any) {
      alert("Failed to export to Google Sheets: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setEmails([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <label className="cursor-pointer group relative flex-shrink-0">
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            {adminProfilePic ? (
              <img src={adminProfilePic} alt="Admin" className="h-12 w-12 rounded-xl object-cover shadow-sm ring-2 ring-transparent group-hover:ring-[#2D5A27] transition-all" />
            ) : (
              <div className="bg-[#2D5A27] p-3 rounded-xl shadow-sm group-hover:bg-[#23471E] transition-colors">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-1 shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </label>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin_panel')}</h1>
        </div>
        
        {activeTab === 'products' && (
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
        )}
      </div>

      <div className="flex space-x-4 border-b border-[#DCE4D8] mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'border-[#2D5A27] text-[#2D5A27]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <Package className="w-5 h-5"/>
          {t('products' as any)}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'border-[#2D5A27] text-[#2D5A27]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <ListChecks className="w-5 h-5"/>
          {t('orders' as any)}
          {orders.filter(o => o.status === 'Processing').length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full leading-none">
              {orders.filter(o => o.status === 'Processing').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'workspace' ? 'border-[#2D5A27] text-[#2D5A27]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <Mail className="w-5 h-5"/>
          Workspace Sync
        </button>
      </div>

      {activeTab === 'products' && (
        <>
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
      </>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E1E8DE] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7F2] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-5 font-bold border-b border-[#E1E8DE]">Order ID</th>
                  <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('customer' as any)}</th>
                  <th className="p-5 font-bold border-b border-[#E1E8DE]">Items</th>
                  <th className="p-5 font-bold border-b border-[#E1E8DE]">{t('status' as any)}</th>
                  <th className="p-5 font-bold border-b border-[#E1E8DE] text-right">{t('actions' as any)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E8DE]">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                )}
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-[#F9FBF8] transition-colors">
                    <td className="p-5">
                      <div className="font-bold text-gray-900">#{order.id}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(order.date).toLocaleString()}</div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-gray-900">{order.customerInfo.name}</div>
                      <div className="text-sm text-gray-600">{order.customerInfo.phone}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-[200px]" title={order.customerInfo.address}>{order.customerInfo.address}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-sm text-gray-700 font-medium">
                        {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                      </div>
                      <div className="font-bold text-[#2D5A27] mt-1">₹{order.totalAmount.toLocaleString()}</div>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-5 text-right whitespace-nowrap">
                      {order.status === 'Processing' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'Delivered')}
                          className="bg-[#2D5A27] hover:bg-[#23471E] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          {t('mark_delivered' as any)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E1E8DE] p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Workspace Integration</h2>
              <p className="text-sm text-gray-500 mt-1">Connect your Google Workspace to send order updates, view unread messages, and export orders to Sheets.</p>
            </div>
            {user && (
              <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
                Disconnect
              </button>
            )}
          </div>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-blue-50 p-4 rounded-full mb-6">
                <Mail className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Google Workspace</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-8">Authenticate securely to sync your emails and allow the store to send automated order status updates.</p>
              
              <button onClick={handleGoogleLogin} className="flex items-center space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Connected account</div>
                  <div className="font-bold text-gray-900">{user.email}</div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleExportOrdersToSheets}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-[#F0FDF4] border border-[#BBF7D0] hover:bg-[#DCFCE7] text-[#166534] px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                    <span>Export Orders to Sheets</span>
                  </button>
                  <button 
                    onClick={handleFetchEmails}
                    disabled={isLoadingEmails}
                    className="flex items-center space-x-2 bg-[#F4F7F2] hover:bg-[#E1E8DE] text-[#2D5A27] px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                    <span>Sync Unread</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {emails.length === 0 && !isLoadingEmails && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-500">No unread emails to display.</p>
                  </div>
                )}
                
                {emails.map(email => {
                  const subjectHeader = email.payload.headers.find((h: any) => h.name === 'Subject');
                  const fromHeader = email.payload.headers.find((h: any) => h.name === 'From');
                  return (
                    <div key={email.id} className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:border-blue-100 transition-colors">
                      <div className="font-bold text-gray-900 mb-1">{subjectHeader ? subjectHeader.value : '(No Subject)'}</div>
                      <div className="text-sm text-gray-500">{fromHeader ? fromHeader.value : 'Unknown Sender'}</div>
                      <div className="text-xs text-gray-400 mt-2">{email.snippet}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
