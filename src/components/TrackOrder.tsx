import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { 
  Search, ArrowLeft, MapPin, Phone, Calendar, 
  DollarSign, Package, CheckCircle2, AlertCircle, 
  Clock, Truck, Printer, FileText, Sparkles 
} from 'lucide-react';
import { Order } from '../types';

interface TrackOrderProps {
  setView: (v: any) => void;
  initialOrderId?: string;
}

export function TrackOrder({ setView, initialOrderId = '' }: TrackOrderProps) {
  const { products, t, language, orders: localOrders } = useStore();
  const [orderIdInput, setOrderIdInput] = useState(initialOrderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      handleSearch(initialOrderId);
    } else {
      const lastId = localStorage.getItem('lastPlacedOrderId');
      if (lastId) {
        localStorage.removeItem('lastPlacedOrderId');
        setOrderIdInput(lastId);
        handleSearch(lastId);
      }
    }
  }, [initialOrderId]);

  const handleSearch = async (targetId?: string) => {
    const idToSearch = (targetId || orderIdInput).trim().toUpperCase();
    if (!idToSearch) {
      setError(language === 'hi' ? 'कृपया एक वैध ऑर्डर आईडी दर्ज करें।' : 'Please enter a valid Order ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);
    setHasSearched(true);

    try {
      // 1. Try to fetch from backend database
      const response = await fetch(`/api/orders/${encodeURIComponent(idToSearch)}`);
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else if (response.status === 404) {
        // 2. Fallback: check in local react context state
        const localMatch = localOrders.find(o => o.id === idToSearch);
        if (localMatch) {
          setOrder(localMatch);
        } else {
          setError(t('order_not_found'));
        }
      } else {
        // 3. Fallback: check in local context if API fails
        const localMatch = localOrders.find(o => o.id === idToSearch);
        if (localMatch) {
          setOrder(localMatch);
        } else {
          throw new Error('Server error');
        }
      }
    } catch (err: any) {
      console.error('Error tracking order:', err);
      // Fallback: search local context
      const localMatch = localOrders.find(o => o.id === idToSearch);
      if (localMatch) {
        setOrder(localMatch);
      } else {
        setError(t('order_not_found'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (orderToPrint: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the invoice.");
      return;
    }

    const itemsHtml = orderToPrint.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${prod ? prod.name : `Product ID: ${item.productId}`}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${(prod?.price || 0).toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">₹${((prod?.price || 0) * item.quantity).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Invoice #${orderToPrint.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
            .header { border-bottom: 2px dashed #2D5A27; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { color: #2D5A27; font-size: 24px; font-weight: bold; margin: 0; }
            .meta-box { background: #F4F7F2; border: 1px solid #DCE4D8; padding: 15px; border-radius: 8px; font-size: 13px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th { background-color: #2D5A27; color: white; padding: 10px; text-align: left; }
            .totals { float: right; width: 300px; font-size: 14px; }
            .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand-total { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: bold; color: #2D5A27; }
            .footer { margin-top: 120px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Shahnawaz Pasu Ahaar Center</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Quality Livestock Feeds & Supplements</div>
            </div>
            <div class="meta-box" style="text-align: right;">
              <div><strong>Invoice / Order Details</strong></div>
              <div style="font-size: 12px; margin-top: 4px; font-family: monospace;">Order ID: #${orderToPrint.id}</div>
              <div style="font-size: 12px;">Date: ${new Date(orderToPrint.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}</div>
            </div>
          </div>

          <div class="details-grid">
            <div>
              <div class="section-title">Delivery To</div>
              <div style="font-weight: bold; font-size: 15px;">${orderToPrint.customerInfo.name}</div>
              <div style="margin-top: 5px; font-size: 13px;">Phone: ${orderToPrint.customerInfo.phone}</div>
              ${orderToPrint.customerInfo.email ? `<div style="font-size: 13px;">Email: ${orderToPrint.customerInfo.email}</div>` : ''}
            </div>
            <div>
              <div class="section-title">Shipping Address</div>
              <div style="font-size: 13px; white-space: pre-wrap; line-height: 1.4;">${orderToPrint.customerInfo.address}</div>
            </div>
          </div>

          <div class="section-title">Items Ordered</div>
          <table>
            <thead>
              <tr>
                <th style="border-top-left-radius: 6px; border-bottom-left-radius: 6px;">Product / Supplement</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 120px;">Price</th>
                <th style="text-align: right; width: 150px; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="overflow: hidden;">
            <div class="totals">
              <div class="totals-row">
                <span>Subtotal</span>
                <span>₹${orderToPrint.totalAmount.toLocaleString()}</span>
              </div>
              <div class="totals-row">
                <span>Delivery Charge</span>
                <span style="color: #15803d; font-weight: 500;">FREE</span>
              </div>
              <div class="totals-row grand-total">
                <span>Grand Total</span>
                <span>₹${orderToPrint.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Shahnawaz Pasu Ahaar Center for your animal nutritional needs!</p>
            <p style="margin-top: 5px;">If you have questions about your delivery, please call support: +91 91100 00000</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBg = (status: Order['status']) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Back to Shop Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100 font-semibold text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{language === 'hi' ? 'दुकान पर वापस जाएं' : 'Back to Shop'}</span>
        </button>

        <span className="text-xs bg-[#2D5A27]/10 dark:bg-emerald-500/10 px-3 py-1 rounded-full text-[#2D5A27] dark:text-emerald-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {language === 'hi' ? 'त्वरित वितरण ट्रैकर' : 'Instant Delivery Tracker'}
        </span>
      </div>

      {/* Main Search Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-[#EEF2EC] dark:border-slate-800/40 relative overflow-hidden">
        {/* Visual Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2D5A27]/5 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
        
        <div className="text-center max-w-xl mx-auto space-y-3 mb-8">
          <div className="w-12 h-12 bg-[#2D5A27]/10 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-[#2D5A27] dark:text-emerald-400 mx-auto mb-2 shadow-sm">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
            {t('track_order')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t('track_order_desc')}
          </p>
        </div>

        {/* Search Field */}
        <div className="max-w-md mx-auto">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder={language === 'hi' ? 'उदा. ABCD123' : 'e.g. ABCD123'}
                className="w-full pl-4 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2D5A27] dark:focus:ring-emerald-600 focus:border-transparent text-sm font-semibold tracking-wider uppercase transition-all shadow-inner"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#2D5A27] hover:bg-[#23471E] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 shrink-0 text-sm flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{t('track_now')}</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback/Errors */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Order Details Card */}
      {order && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-[#EEF2EC] dark:border-slate-800/40 overflow-hidden animate-slide-up">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#2D5A27]/5 to-[#447A3C]/5 dark:from-slate-850 dark:to-slate-900 px-6 sm:px-8 py-5 border-b border-[#EEF2EC] dark:border-slate-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {language === 'hi' ? 'ऑर्डर ट्रैकिंग आईडी' : 'Order Tracking ID'}
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-slate-100 font-mono tracking-wide">
                #{order.id}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <span className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full border ${getStatusBg(order.status)}`}>
                {language === 'hi'
                  ? order.status === 'Delivered' ? 'वितरित किया गया' : order.status === 'Processing' ? 'प्रगति पर है' : 'भुगतान लंबित है'
                  : order.status
                }
              </span>
              <button
                onClick={() => handlePrint(order)}
                className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl border border-gray-200 dark:border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title={language === 'hi' ? 'रसीद प्रिंट करें' : 'Print Invoice'}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invoice</span>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Visual Stepper */}
            <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-2xl border border-gray-100 dark:border-slate-850/30">
              <div className="relative flex items-center justify-between w-full mb-2 px-2 sm:px-4">
                {/* Connector Lines */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-800 rounded-full" />
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full transition-all duration-700 ${
                  order.status === 'Delivered' ? 'w-full bg-green-500 dark:bg-emerald-500' : 
                  order.status === 'Processing' ? 'w-1/2 bg-blue-500 dark:bg-blue-600' : 
                  'w-[2%]'
                }`} />
                
                {/* Step 1: Pending */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-md transition-all duration-300 ${
                    ['Pending Payment', 'Processing', 'Delivered'].includes(order.status) 
                      ? 'bg-yellow-500 scale-110 shadow-yellow-500/20' 
                      : 'bg-gray-300 dark:bg-slate-700 text-gray-500'
                  }`}>
                    {order.status === 'Pending Payment' ? <Clock className="w-4 h-4 animate-pulse" /> : '1'}
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-gray-700 dark:text-slate-300 mt-2 uppercase tracking-wider text-center">
                    {language === 'hi' ? 'लंबित' : 'Pending'}
                  </span>
                </div>

                {/* Step 2: Processing */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-md transition-all duration-300 ${
                    ['Processing', 'Delivered'].includes(order.status) 
                      ? 'bg-blue-500 dark:bg-blue-600 scale-110 shadow-blue-500/20' 
                      : 'bg-gray-300 dark:bg-slate-700 text-gray-400'
                  }`}>
                    {order.status === 'Processing' ? <Truck className="w-4 h-4 animate-bounce" /> : '2'}
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-gray-700 dark:text-slate-300 mt-2 uppercase tracking-wider text-center">
                    {language === 'hi' ? 'प्रगति पर है' : 'Processing'}
                  </span>
                </div>

                {/* Step 3: Delivered */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-md transition-all duration-300 ${
                    order.status === 'Delivered' 
                      ? 'bg-green-500 dark:bg-emerald-500 scale-110 shadow-green-500/20' 
                      : 'bg-gray-300 dark:bg-slate-700 text-gray-400'
                  }`}>
                    {order.status === 'Delivered' ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-gray-700 dark:text-slate-300 mt-2 uppercase tracking-wider text-center">
                    {language === 'hi' ? 'वितरित' : 'Delivered'}
                  </span>
                </div>
              </div>

              {/* Friendly Status Alert Message */}
              <div className="mt-6 text-center border-t border-gray-200/60 dark:border-slate-800/50 pt-4 text-xs font-semibold text-gray-600 dark:text-slate-400">
                {order.status === 'Delivered' ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {language === 'hi' ? 'ऑर्डर सफलतापूर्वक वितरित किया गया। पशुओं को स्वस्थ रखें!' : 'Order delivered successfully. Keep your livestock nourished!'}
                  </span>
                ) : order.status === 'Processing' ? (
                  <span className="text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
                    <Truck className="w-4 h-4 animate-pulse shrink-0" />
                    {language === 'hi' ? 'आपका पशु आहार तैयार किया जा रहा है और जल्द ही भेजा जाएगा।' : 'Your animal nutrition feed is packed and dispatch is in transit!'}
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-500 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    {language === 'hi' ? 'भुगतान सत्यापन की प्रतीक्षा है। सत्यापन होते ही तैयारी शुरू हो जाएगी।' : 'Waiting for payment verification to initiate dispatch protocols.'}
                  </span>
                )}
              </div>
            </div>

            {/* Address & Recipient details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-gray-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-gray-100 dark:border-slate-850/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D5A27] dark:text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'प्राप्तकर्ता का विवरण' : 'Recipient Details'}</span>
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
                  <p className="font-bold text-gray-900 dark:text-slate-100">{order.customerInfo.name}</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{order.customerInfo.phone}</span>
                  </p>
                  {order.customerInfo.email && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {order.customerInfo.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {language === 'hi' ? 'आदेश दिनांक' : 'Ordered on'}: {new Date(order.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-gray-100 dark:border-slate-850/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D5A27] dark:text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{language === 'hi' ? 'वितरण का पता' : 'Delivery Address'}</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                  {order.customerInfo.address}
                </p>
              </div>
            </div>

            {/* Items Summary list */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'ऑर्डर की गई सामग्री' : 'Items Ordered'}</span>
              </h4>
              <div className="border border-gray-100 dark:border-slate-850 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-850">
                {order.items.map((item, idx) => {
                  const prod = products.find(p => p.id === item.productId);
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 text-sm hover:bg-gray-50/40 dark:hover:bg-slate-850/20 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                          {prod ? prod.name : `Product ID: ${item.productId}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {prod ? `${prod.category} • ` : ''}₹{(prod?.price || 0).toLocaleString()} x {item.quantity}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-900 dark:text-slate-100">
                          ₹{((prod?.price || 0) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing Summary section */}
            <div className="bg-[#2D5A27]/5 dark:bg-emerald-950/10 border border-[#2D5A27]/10 dark:border-emerald-900/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold block">
                  {language === 'hi' ? 'कुल राशि (मुफ़्त डिलीवरी)' : 'Total Amount (FREE Delivery)'}
                </span>
                <span className="text-2xl font-black text-[#2D5A27] dark:text-emerald-400 flex items-center">
                  ₹{order.totalAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 leading-normal max-w-sm">
                {language === 'hi'
                  ? 'वितरण या भुगतान से संबंधित किसी भी सहायता के लिए, कृपया हमारे हेल्पलाइन नंबर पर संपर्क करें।'
                  : 'For assistance with payments or delivery questions, keep this Order ID ready and call us.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Search result fallback */}
      {!order && hasSearched && !loading && (
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-[#EEF2EC] dark:border-slate-800/40 space-y-3">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">
            {language === 'hi' ? 'ऑर्डर नहीं मिला' : 'Order Not Found'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
            {language === 'hi' 
              ? 'हम दर्ज की गई आईडी के लिए कोई सक्रिय ऑर्डर नहीं ढूंढ पाए। कृपया दोबारा जांचें कि क्या आईडी सही है।' 
              : 'We could not find an active delivery record matching this ID. Please double check the formatting.'}
          </p>
        </div>
      )}
    </div>
  );
}
