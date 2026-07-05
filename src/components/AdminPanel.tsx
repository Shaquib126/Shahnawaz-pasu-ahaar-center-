import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { Category } from '../types';
import { Plus, Trash2, ShieldCheck, X, Edit2, Package, ListChecks, CheckCircle2, Mail, RefreshCw, Camera, User, LayoutDashboard, DollarSign, ShoppingCart, Activity, AlertTriangle, Download } from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from '../auth';

export function AdminPanel() {
  const { products, orders, addProduct, updateProduct, deleteProduct, updateOrderStatus, adminProfilePic, setAdminProfilePic, changeAdminPassword, t, language } = useStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'workspace' | 'settings'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Payment' | 'Processing' | 'Delivered'>('All');
  
  const lowStockProducts = products.filter(p => p.stock < 5);
  
  const [newPassword, setNewPassword] = useState('');

  const exportToCSV = () => {
    const headers = ["ID", "Name", "Category", "Description", "Price (INR)", "Stock Quantity", "Image URL"];
    
    const rows = products.map(product => [
      product.id,
      `"${product.name.replace(/"/g, '""')}"`,
      `"${product.category.replace(/"/g, '""')}"`,
      `"${(product.description || '').replace(/"/g, '""')}"`,
      product.price,
      product.stock,
      `"${(product.imageUrl || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending Payment') {
      return order.status === 'Pending Payment' || order.status === 'Pending';
    }
    return order.status === statusFilter;
  });
  
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

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const videoElement = document.getElementById('product-camera-preview') as HTMLVideoElement | null;
    if (videoElement) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
        stopCamera();
      }
    }
  };

  useEffect(() => {
    const videoElement = document.getElementById('product-camera-preview') as HTMLVideoElement | null;
    if (videoElement && cameraStream) {
      videoElement.srcObject = cameraStream;
      videoElement.play().catch(err => console.error("Video play error:", err));
    }
  }, [cameraStream, isCameraActive]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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
    
    stopCamera();
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
      await googleSignIn(true);
    } catch (err: any) {
      alert("Failed to initiate Google login: " + err.message);
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
              <img src={adminProfilePic} alt="Admin" className="h-12 w-12 rounded-xl object-cover shadow-sm ring-2 ring-transparent group-hover:ring-[#2D5A27] dark:group-hover:ring-emerald-400 transition-all" />
            ) : (
              <div className="bg-[#2D5A27] p-3 rounded-xl shadow-sm group-hover:bg-[#23471E] transition-colors">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 bg-white dark:bg-slate-800 rounded-full p-1 shadow border border-gray-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            </div>
          </label>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('admin_panel')}</h1>
        </div>
        
        {activeTab === 'products' && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-750 dark:text-slate-200 border border-gray-250 dark:border-slate-700 font-bold px-4 py-2.5 rounded-lg transition-all flex items-center space-x-2 shadow-sm hover:shadow active:scale-95 text-sm"
              title={language === 'hi' ? 'इन्वेंटरी निर्यात करें' : 'Export products list to CSV'}
              id="btn-export-inventory-csv"
            >
              <Download className="h-4 w-4 text-[#2D5A27] dark:text-emerald-400" />
              <span className="hidden sm:inline">{language === 'hi' ? 'इन्वेंटरी निर्यात (CSV)' : 'Export Inventory (CSV)'}</span>
              <span className="sm:hidden">{language === 'hi' ? 'निर्यात' : 'Export'}</span>
            </button>
            <button
              onClick={() => {
                setIsFormOpen(!isFormOpen);
                if (isFormOpen) {
                  stopCamera();
                  setEditingId(null);
                  setFormData({ name: '', category: 'Feed', description: '', price: '', stock: '', imageUrl: '' });
                }
              }}
              className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-medium px-5 py-2.5 rounded-lg transition-all flex items-center space-x-2 shadow-sm hover:shadow active:scale-95 text-sm"
            >
              {isFormOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              <span>{isFormOpen ? t('close') : t('add_product')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex space-x-4 border-b border-[#DCE4D8] dark:border-slate-800 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'border-[#2D5A27] text-[#2D5A27] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-350'}`}
        >
          <LayoutDashboard className="w-5 h-5"/>
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'border-[#2D5A27] text-[#2D5A27] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-350'}`}
        >
          <Package className="w-5 h-5"/>
          {t('products' as any)}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'border-[#2D5A27] text-[#2D5A27] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-350'}`}
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
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'workspace' ? 'border-[#2D5A27] text-[#2D5A27] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-350'}`}
        >
          <Mail className="w-5 h-5"/>
          Workspace Sync
        </button>
        <button 
          onClick={() => setActiveTab('settings' as any)}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === 'settings' as any ? 'border-[#2D5A27] text-[#2D5A27] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-slate-350'}`}
        >
          <ShieldCheck className="w-5 h-5"/>
          Settings
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#DCE4D8] dark:border-slate-800 p-6 flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-950/40 p-3 rounded-xl">
                <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Total Orders</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-slate-100">{orders.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#DCE4D8] dark:border-slate-800 p-6 flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 dark:bg-emerald-950/40 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Total Revenue</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-slate-100">₹{orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#DCE4D8] dark:border-slate-800 p-6 flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-100 dark:bg-purple-950/40 p-3 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Items Sold</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-slate-100">{orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</p>
          </div>
          <div 
            onClick={() => setActiveTab('products')}
            className={`cursor-pointer rounded-2xl shadow-sm border p-6 flex flex-col transition-all hover:scale-[1.02] ${
              lowStockProducts.length > 0 
                ? 'bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30' 
                : 'bg-white dark:bg-slate-900 border-[#DCE4D8] dark:border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-3 rounded-xl ${
                lowStockProducts.length > 0 
                  ? 'bg-amber-100 dark:bg-amber-950/50 animate-pulse' 
                  : 'bg-gray-100 dark:bg-slate-800'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  lowStockProducts.length > 0 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-gray-500 dark:text-slate-400'
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Low Stock</h3>
            </div>
            <p className={`text-4xl font-bold ${
              lowStockProducts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-slate-100'
            }`}>
              {lowStockProducts.length}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <>
          {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-green-200 dark:border-slate-800 p-8 mb-8 animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-6">{editingId ? t('edit' as any) : t('add_product')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('name')}</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all" />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('category')}</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all">
                <option value="Feed" className="bg-white dark:bg-slate-900">{t('feed')}</option>
                <option value="Medicine" className="bg-white dark:bg-slate-900">{t('medicine')}</option>
                <option value="Appetite" className="bg-white dark:bg-slate-900">{t('appetite')}</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('description')}</label>
              <textarea required rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('price')}</label>
              <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('stock')}</label>
              <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all" />
            </div>

            <div className="space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">{t('image_url' as any)}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                      isCameraActive 
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-100' 
                        : 'bg-green-50 dark:bg-emerald-950/20 text-[#2D5A27] dark:text-emerald-400 border-green-200 dark:border-emerald-900/50 hover:bg-green-100'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isCameraActive ? 'Turn Off Camera' : 'Take Photo with Camera'}</span>
                  </button>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-all"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
              </div>

              {isCameraActive && (
                <div className="bg-gray-100 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800 space-y-4 animate-fade-in">
                  <div className="relative aspect-video max-w-md mx-auto bg-black rounded-lg overflow-hidden shadow-inner border border-gray-300 dark:border-slate-700">
                    <video 
                      id="product-camera-preview" 
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      Live Feed
                    </div>
                  </div>
                  
                  {cameraError && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center font-semibold">{cameraError}</p>
                  )}

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="inline-flex items-center gap-1.5 bg-[#2D5A27] hover:bg-[#23471E] text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-750 dark:text-slate-200 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <input 
                    type="url" 
                    placeholder="https://example.com/image.jpg" 
                    value={formData.imageUrl} 
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 dark:text-slate-100 transition-all text-sm" 
                  />
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">Enter an image link directly or use the camera to snap a live photo.</p>
                </div>

                {formData.imageUrl && (
                  <div className="relative group rounded-xl overflow-hidden border border-[#DCE4D8] dark:border-slate-800 bg-gray-50 dark:bg-slate-950 aspect-video md:aspect-auto md:h-[48px] flex items-center p-2 gap-3 shadow-inner">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=120&q=80';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Image Preview</div>
                      <div className="text-xs text-gray-600 dark:text-slate-350 truncate font-mono">{formData.imageUrl.startsWith('data:image') ? 'Base64 Camera Image' : formData.imageUrl}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 flex justify-end pt-4 mt-2 border-t border-gray-100 dark:border-slate-800">
              <button type="submit" className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors">
                {t('save_product' as any)}
              </button>
            </div>
          </form>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                Low Stock Inventory Alert
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product is' : 'products are'} running extremely low on stock (under 5 units). Click any item below to update its inventory immediately:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {lowStockProducts.map(p => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="inline-flex items-center gap-1.5 bg-amber-100/80 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-[11px] font-bold text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 transition-all hover:scale-105"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{p.name} ({p.stock} left)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E1E8DE] dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7F2] dark:bg-slate-950/60 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('name')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('category')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('price')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('stock')}</th>
                <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800 text-right">{t('actions' as any)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E8DE] dark:divide-slate-800">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-[#F9FBF8] dark:hover:bg-slate-850/40 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <div className="font-bold text-gray-900 dark:text-slate-100 mb-0.5">{product.name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#E9F0E6] dark:bg-emerald-950/40 text-[#2D5A27] dark:text-emerald-400 uppercase tracking-wider">
                      {t(product.category.toLowerCase() as any)}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-gray-900 dark:text-slate-100 text-lg">₹{product.price}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-lg ${product.stock > 0 ? 'text-gray-900 dark:text-slate-100' : 'text-red-500'}`}>
                        {product.stock}
                      </span>
                      {product.stock === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 uppercase tracking-wider border border-red-200 dark:border-red-900/30">
                          Out Of Stock
                        </span>
                      ) : product.stock < 5 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 uppercase tracking-wider border border-amber-200 dark:border-amber-900/30">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Low Stock
                        </span>
                      ) : null}
                    </div>
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
        <div className="space-y-4 animate-fade-in">
          {/* Status filter toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E1E8DE] dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-805 dark:text-slate-100">
                {t('orders' as any)}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Showing {filteredOrders.length} of {orders.length} total orders
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <label htmlFor="status-filter" className="text-xs font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider">
                Filter by Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3.5 py-1.5 bg-gray-50 dark:bg-slate-950 border border-[#DCE4D8] dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#2D5A27] focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm cursor-pointer"
              >
                <option value="All" className="bg-white dark:bg-slate-900">All Statuses</option>
                <option value="Pending Payment" className="bg-white dark:bg-slate-900">Pending Payment</option>
                <option value="Processing" className="bg-white dark:bg-slate-900">Processing</option>
                <option value="Delivered" className="bg-white dark:bg-slate-900">Delivered</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E1E8DE] dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F4F7F2] dark:bg-slate-950/60 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">Order ID</th>
                    <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('customer' as any)}</th>
                    <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">Items</th>
                    <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800">{t('status' as any)}</th>
                    <th className="p-5 font-bold border-b border-[#E1E8DE] dark:border-slate-800 text-right">{t('actions' as any)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E8DE] dark:divide-slate-800">
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-gray-500 dark:text-slate-400">
                        {statusFilter === 'All' ? 'No orders found.' : `No orders found with status "${statusFilter}".`}
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-[#F9FBF8] dark:hover:bg-slate-850/40 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-gray-900 dark:text-slate-100">#{order.id}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{new Date(order.date).toLocaleString()}</div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-gray-900 dark:text-slate-100">{order.customerInfo.name}</div>
                        <div className="text-sm text-gray-650 dark:text-slate-350">{order.customerInfo.phone}</div>
                        {order.customerInfo.email && <div className="text-xs text-[#2D5A27] dark:text-emerald-400">{order.customerInfo.email}</div>}
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2 max-w-[200px]" title={order.customerInfo.address}>{order.customerInfo.address}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-sm text-gray-700 dark:text-slate-300 font-medium font-mono">
                          {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                        </div>
                        <div className="font-bold text-[#2D5A27] dark:text-emerald-400 mt-1">₹{order.totalAmount.toLocaleString()}</div>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'Processing' ? 'bg-[#FFFBEB] dark:bg-amber-950/40 text-[#B45309] dark:text-amber-400' :
                          order.status === 'Delivered' ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-450' :
                          'bg-[#F3F4F6] dark:bg-slate-800 text-[#374151] dark:text-slate-305'
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
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E1E8DE] dark:border-slate-800 p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Workspace Integration</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Connect your Google Workspace to send order updates, view unread messages, and export orders to Sheets.</p>
            </div>
            {user && (
              <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
                Disconnect
              </button>
            )}
          </div>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full mb-6">
                <Mail className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">Connect Google Workspace</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-md mb-8">Authenticate securely to sync your emails and allow the store to send automated order status updates.</p>
              
              <button onClick={handleGoogleLogin} className="flex items-center space-x-3 bg-white dark:bg-slate-850 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium px-6 py-3 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <div className="text-sm text-gray-500 dark:text-slate-450 mb-1">Connected account</div>
                  <div className="font-bold text-gray-900 dark:text-slate-100">{user.email}</div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleExportOrdersToSheets}
                    disabled={isExporting}
                    className="flex items-center space-x-2 bg-[#F0FDF4] dark:bg-emerald-950/40 border border-[#BBF7D0] dark:border-emerald-900 hover:bg-[#DCFCE7] dark:hover:bg-emerald-900/60 text-[#166534] dark:text-emerald-400 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                    <span>Export Orders to Sheets</span>
                  </button>
                  <button 
                    onClick={handleFetchEmails}
                    disabled={isLoadingEmails}
                    className="flex items-center space-x-2 bg-[#F4F7F2] dark:bg-slate-800 hover:bg-[#E1E8DE] dark:hover:bg-slate-700 text-[#2D5A27] dark:text-emerald-400 border border-transparent dark:border-slate-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                    <span>Sync Unread</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {emails.length === 0 && !isLoadingEmails && (
                  <div className="text-center py-12 bg-gray-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-450">No unread emails to display.</p>
                  </div>
                )}
                
                {emails.map(email => {
                  const subjectHeader = email.payload.headers.find((h: any) => h.name === 'Subject');
                  const fromHeader = email.payload.headers.find((h: any) => h.name === 'From');
                  return (
                    <div key={email.id} className="p-4 bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 shadow-sm rounded-xl hover:border-blue-105 dark:hover:border-blue-900 transition-colors">
                      <div className="font-bold text-gray-900 dark:text-slate-100 mb-1">{subjectHeader ? subjectHeader.value : '(No Subject)'}</div>
                      <div className="text-sm text-gray-550 dark:text-slate-400">{fromHeader ? fromHeader.value : 'Unknown Sender'}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 mt-2">{email.snippet}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E1E8DE] dark:border-slate-800 p-8 animate-fade-in">
          <div className="mb-8 border-b border-gray-100 dark:border-slate-800 pb-6">
            <h2 className="text-xl font-bold text-gray-808 dark:text-slate-100">Admin Settings</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your administrator account preferences.</p>
          </div>

          <div className="max-w-md space-y-10">
            <div>
              <h3 className="text-lg font-semibold text-gray-808 dark:text-slate-205 mb-4">Profile Picture</h3>
              <div className="flex items-center gap-6">
                {adminProfilePic ? (
                  <img src={adminProfilePic} alt="Admin Profile" className="h-20 w-20 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-105 dark:bg-slate-950 flex items-center justify-center text-gray-400 dark:text-slate-500">
                    <User className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <label className="bg-white dark:bg-slate-850 border border-[#DCE4D8] dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg cursor-pointer transition-colors inline-flex items-center text-sm shadow-sm">
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAdminProfilePic(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {adminProfilePic && (
                    <button 
                      onClick={() => setAdminProfilePic(null)}
                      className="text-red-500 hover:text-red-650 text-sm font-medium ml-4 mt-2 inline-block transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-gray-500 dark:text-slate-450 mt-2">Recommended: 256x256px or larger. Max 2MB.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-808 dark:text-slate-205 mb-4">Change Password</h3>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword.length < 6) {
                  alert('Password must be at least 6 characters.');
                  return;
                }
                changeAdminPassword(newPassword);
                setNewPassword('');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-705 dark:text-slate-350 mb-1">New Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit"
                className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm text-sm"
              >
                Update Password
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
