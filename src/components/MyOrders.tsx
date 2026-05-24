import React, { useEffect, useState } from 'react';
import { useStore } from '../StoreContext';
import { ShoppingBag, Calendar, MapPin, Phone, RefreshCw, AlertCircle, ArrowLeft, Clock, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { Order } from '../types';

interface MyOrdersProps {
  setView: (v: any) => void;
}

export function MyOrders({ setView }: MyOrdersProps) {
  const { currentUser, loginCustomer, products, t, language, cancelOrder } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const triggerCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm(
      language === 'hi'
        ? "क्या आप निश्चित रूप से इस ऑर्डर को रद्द करना चाहते हैं?"
        : "Are you sure you want to cancel this order? This will permanently remove it from the database."
    );
    if (!confirmCancel) return;

    setCancellingId(orderId);
    try {
      const success = await cancelOrder(orderId);
      if (success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        alert(language === 'hi' ? "ऑर्डर सफलतापूर्वक रद्द कर दिया गया है।" : "Order has been successfully cancelled and removed.");
      } else {
        alert(language === 'hi' ? "ऑर्डर रद्द करने में विफल। कृपया पुनः प्रयास करें।" : "Failed to cancel the order. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error occurred while canceling order.");
    } finally {
      setCancellingId(null);
    }
  };

  const fetchUserOrders = async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders?email=${encodeURIComponent(currentUser.email)}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve order history');
      }
      const data = await response.json();
      setOrders(data);
    } catch (err: any) {
      console.error('Error fetching user orders:', err);
      setError(err.message || 'Error occurred while loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      fetchUserOrders();
    } else {
      setOrders([]);
    }
  }, [currentUser]);

  const handlePrint = (order: Order) => {
    // We can create a print window or trigger printable summary
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print.");
      return;
    }

    const itemsHtml = order.items.map(item => {
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
          <title>Order Invoice #${order.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
            .header { border-bottom: 2px dashed #2D5A27; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .title { color: #2D5A27; font-size: 24px; font-weight: bold; margin: 0; }
            .meta-box { background: #F4F7F2; border: 1px solid #DCE4D8; padding: 15px; border-radius: 8px; font-size: 13px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th { background: #f9f9f9; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; font-weight: bold; }
            .total-table { width: 300px; margin-left: auto; font-size: 14px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { font-size: 16px; font-weight: bold; color: #2D5A27; background: #E9F0E6; padding: 10px; border-radius: 6px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Shahnawaz Pasu Ahaar Center</h1>
              <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">Premium Cattle Feed, Nutrients & Veterinary Care</p>
            </div>
            <div class="meta-box">
              <strong>Order No:</strong> #${order.id}<br>
              <strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}<br>
              <strong>Status:</strong> ${order.status}
            </div>
          </div>
          
          <div class="details-grid">
            <div>
              <div class="section-title">Customer Details</div>
              <strong>${order.customerInfo.name}</strong><br>
              Phone: ${order.customerInfo.phone}<br>
              ${order.customerInfo.email ? `Email: ${order.customerInfo.email}<br>` : ''}
            </div>
            <div>
              <div class="section-title">Delivery Address</div>
              <p style="margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.5;">${order.customerInfo.address}</p>
            </div>
          </div>

          <div class="section-title">Ordered Items</div>
          <table>
            <thead>
              <tr>
                <th>Product Description</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 120px;">Unit Price</th>
                <th style="text-align: right; width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-table">
            <div class="total-row" style="color: #666; font-size: 13px;">
              <span>Subtotal</span>
              <span>₹${(order.totalAmount - (order.totalAmount > 50 ? 50 : 0)).toLocaleString()}</span>
            </div>
            <div class="total-row" style="color: #666; font-size: 13px; margin-bottom: 8px;">
              <span>Delivery Fee</span>
              <span>₹${order.totalAmount > 50 ? 50 : 0}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total Paid/Due</span>
              <span>₹${order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing Shahnawaz Pasu Ahaar Center to nourish your livestock!</p>
            <p style="color: #999; font-size: 10px;">Generated automatically on ${new Date().toLocaleString()}</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#E1E8DE] flex flex-col items-center">
          <div className="w-16 h-16 bg-[#E9F0E6] rounded-full flex items-center justify-center text-[#2D5A27] mb-6">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Your Orders</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Please sign in with your Google Account to view your order history, delivery progress, and invoices in real-time.
          </p>
          <button
            onClick={() => loginCustomer()}
            className="w-full py-3 px-5 bg-[#2D5A27] hover:bg-[#23471E] text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
          <button
            onClick={() => setView('shop')}
            className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => setView('shop')}
            className="text-xs font-bold text-[#2D5A27] hover:text-[#1E3B1A] flex items-center gap-1 mb-2 group transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Continue Shopping</span>
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            My Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Logged in as <span className="font-semibold text-gray-700">{currentUser.email}</span>
          </p>
        </div>

        <button
          onClick={fetchUserOrders}
          disabled={loading}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2 bg-white border border-[#DCE4D8] hover:bg-[#F4F7F2] text-gray-700 font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-55"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Updates</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#2D5A27] animate-spin mb-4" />
          <p className="text-sm text-gray-500">Retrieving your cattle feed orders from MongoDB...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Synchronization Delay</h4>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">{error}</p>
            <button 
              onClick={fetchUserOrders}
              className="mt-3 text-xs font-bold text-red-800 hover:underline flex items-center gap-1"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Orders List Container */}
      {!loading && orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E1E8DE] p-8 shadow-sm">
          <div className="mx-auto w-12 h-12 bg-[#F4F7F2] rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="h-6 w-6 text-[#A5C09D]" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Orders Found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed">
            We couldn't find any orders matching <span className="font-semibold">{currentUser.email}</span>. Please place an order using this email at checkout.
          </p>
          <button
            onClick={() => setView('shop')}
            className="mt-6 py-2.5 px-6 bg-[#2D5A27] hover:bg-[#23471E] text-white rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-[#E1E8DE] shadow-sm overflow-hidden transition-all hover:shadow-md">
              {/* Order Header Block */}
              <div className="bg-[#FAFBF9] border-b border-[#E1E8DE] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">#{order.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(order.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-gray-400 text-xs block">Order Total</span>
                    <span className="font-bold text-[#2D5A27] text-base leading-none">₹{order.totalAmount.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handlePrint(order)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-all border border-gray-100 hover:border-gray-300"
                    title="Print Invoice / Summary"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Body Details */}
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product list */}
                <div>
                  <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-3">Items Summary</h3>
                  <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto pr-1">
                    {order.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <div key={`${item.productId}-${idx}`} className="py-2.5 flex justify-between items-center text-xs">
                          <div className="flex-1 min-w-0 pr-3">
                            <span className="font-semibold text-gray-900 truncate block">
                              {prod ? prod.name : `Product ID: ${item.productId}`}
                            </span>
                            <span className="text-gray-400 text-[10px] uppercase">
                              {prod ? t(prod.category.toLowerCase() as any) : ''}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-gray-800">
                              {item.quantity} × ₹{(prod?.price || 0).toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-[10px]">
                              ₹{((prod?.price || 0) * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shipping info */}
                <div className="bg-[#FAFBF9] rounded-xl p-4 border border-[#ECEFEA] flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#2D5A27]" />
                      <span>Delivery Details</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400 block">Recipient Name</span>
                        <span className="font-bold text-gray-800">{order.customerInfo.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="font-medium text-gray-700">{order.customerInfo.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Shipping Location</span>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{order.customerInfo.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Bar */}
                  <div className="mt-4 pt-4 border-t border-[#EEF2EC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {order.status === 'Delivered' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-gray-700 text-[11px]">Delivered successfully. Keep animals healthy!</span>
                        </>
                      ) : order.status === 'Processing' ? (
                        <>
                          <Clock className="w-4 h-4 text-blue-600 animate-pulse flex-shrink-0" />
                          <span className="font-medium text-gray-700 text-[11px]">Cattle feed is being packed and dispatched.</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <span className="font-medium text-gray-700 text-[11px]">Awaiting UPI verification or cash collection.</span>
                        </>
                      )}
                    </div>

                    {order.status === 'Pending Payment' && (
                      <button
                        onClick={() => triggerCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="self-start sm:self-auto px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs rounded-lg border border-red-200 transition-all active:scale-95 disabled:opacity-55 flex items-center gap-1"
                      >
                        {cancellingId === order.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                            <span>Canceling...</span>
                          </>
                        ) : (
                          <span>Cancel Order</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
