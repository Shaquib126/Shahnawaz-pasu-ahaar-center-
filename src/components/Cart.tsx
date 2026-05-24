import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { Trash2, Plus, Minus, ArrowLeft, CheckCircle2, ShoppingCart, Leaf, Truck, MapPin, MessageCircle, X, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

export function Cart({ setView }: { setView: (v: any) => void }) {
  const { cart, products, updateCartQuantity, removeFromCart, clearCart, t, placeOrder, currentUser } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: currentUser?.displayName || '',
    phone: '',
    address: '',
    email: currentUser?.email || ''
  });

  useEffect(() => {
    if (currentUser) {
      setDeliveryDetails(d => ({
        ...d,
        name: d.name || currentUser.displayName || '',
        email: d.email || currentUser.email || ''
      }));
    }
  }, [currentUser]);

  const [isLocating, setIsLocating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState<'pay' | 'whatsapp' | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const cartItems = cart.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)!
  })).filter(item => item.product);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const deliveryFee = 50; // Fixed delivery fee
  const total = subtotal + deliveryFee;

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    
    const fallbackToIPLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city) {
          const address = `${data.city}, ${data.region}, ${data.country_name}`;
          setDeliveryDetails(d => ({ ...d, address }));
        } else {
          alert("Unable to automatically detect location. Please enter manually.");
        }
      } catch (e) {
        alert("Failed to retrieve location. Please enter manually.");
      } finally {
        setIsLocating(false);
      }
    };

    if (!navigator.geolocation) {
      await fallbackToIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setDeliveryDetails(d => ({ ...d, address: data.display_name }));
          } else {
            setDeliveryDetails(d => ({ ...d, address: `${latitude}, ${longitude}` }));
          }
        } catch (err) {
          setDeliveryDetails(d => ({ ...d, address: `${position.coords.latitude}, ${position.coords.longitude}` }));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        // Fallback to IP if geolocation fails (e.g. permission denied or iframe blocked)
        fallbackToIPLocation();
      },
      { timeout: 5000 }
    );
  };

  const handleWhatsAppOrderClick = () => {
    if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address || !deliveryDetails.email) {
      alert("Please fill in your delivery details (including email) first.");
      return;
    }
    setCheckoutAction('whatsapp');
    setShowConfirmModal(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address || !deliveryDetails.email) return;
    setCheckoutAction('pay');
    setShowConfirmModal(true);
  };

  const processWhatsAppOrder = () => {
    const itemsText = cartItems.map(item => 
      `- ${item.product.name} (x${item.quantity}) - ₹${item.product.price * item.quantity}`
    ).join('%0A');

    const message = `Hello! I would like to place an order:%0A%0A${itemsText}%0A%0ASubtotal: ₹${subtotal}%0ADelivery Fee: ₹${deliveryFee}%0A*Total: ₹${total}*%0A%0A*Delivery Details:*%0AName: ${deliveryDetails.name}%0APhone: ${deliveryDetails.phone}%0AAddress: ${deliveryDetails.address}`;

    const orderId = placeOrder({
      items: cart,
      customerInfo: deliveryDetails,
      totalAmount: total
    });
    
    setPlacedOrder({
      id: orderId,
      date: new Date().toISOString(),
      items: [...cart],
      customerInfo: deliveryDetails,
      totalAmount: total,
      status: 'Pending Payment'
    });

    clearCart();

    const whatsappUrl = `https://wa.me/9196169461?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const [showUpiModal, setShowUpiModal] = useState(false);
  const upiId = (import.meta as any).env.VITE_UPI_ID || "merchant@upi";
  const upiName = (import.meta as any).env.VITE_UPI_NAME || "EcoShop";

  const processUpiPayment = () => {
    setShowConfirmModal(false);
    setShowUpiModal(true);
  };

  const finalizeOrder = () => {
    // 1. Create a pending order internally
    const orderId = placeOrder({
      items: cart,
      customerInfo: deliveryDetails,
      totalAmount: total
    });
    
    setPlacedOrder({
      id: orderId,
      date: new Date().toISOString(),
      items: [...cart],
      customerInfo: deliveryDetails,
      totalAmount: total,
      status: 'Pending Payment'
    });

    clearCart();
    alert("Thank you! Your order has been placed and payment is verifying.");
  };

  const confirmOrder = async () => {
    if (checkoutAction === 'whatsapp') {
      setShowConfirmModal(false);
      processWhatsAppOrder();
    } else if (checkoutAction === 'pay') {
      processUpiPayment();
    }
  };

  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in pb-16">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden !important;
            }
            #invoice-print-area, #invoice-print-area * {
              visibility: visible !important;
            }
            #invoice-print-area {
              position: absolute !important;
              left: 4mm !important;
              top: 4mm !important;
              width: calc(100% - 8mm) !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}} />

        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center print:hidden">
          <div className="flex items-center space-x-3">
            <div className="bg-[#2D5A27] text-white p-2 rounded-full">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Order Placed Successfully!</h2>
              <p className="text-sm text-gray-500">Order #{placedOrder.id} is registered</p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-[#DCE4D8] hover:bg-[#F4F7F2] text-gray-700 rounded-xl font-bold transition-all shadow-sm"
              id="btn-print-invoice"
            >
              <Printer className="w-5 h-5 text-gray-500" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={() => {
                setPlacedOrder(null);
                setView('shop');
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2D5A27] hover:bg-[#23471E] text-white rounded-xl font-bold transition-all shadow-sm"
              id="btn-return-shop"
            >
              <span>Return to Shop</span>
            </button>
          </div>
        </div>

        <div 
          id="invoice-print-area" 
          className="bg-white rounded-2xl shadow-sm border border-[#E1E8DE] p-6 sm:p-8 md:p-10 text-[#2C3E2D]"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-dashed border-[#E1E8DE]">
            <div>
              <h1 className="text-2xl font-bold text-[#2D5A27] leading-tight mb-1">
                Shahnawaz Pasu Ahaar Center
              </h1>
              <p className="text-xs text-gray-500 max-w-sm">
                Premium Cattle Feed, Nutrients & Veterinary Medicines shop. Thank you for your business!
              </p>
            </div>
            <div className="sm:text-right bg-[#F4F7F2] p-3 rounded-xl border border-[#E1E8DE] min-w-[200px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#2D5A27] block mb-1">TAX INVOICE / RECEIPT</span>
              <div className="text-sm font-bold text-gray-800">No: #{placedOrder.id}</div>
              <div className="text-xs text-gray-500 mt-1">Date: {new Date(placedOrder.date).toLocaleDateString()}</div>
              <div className="text-xs text-gray-500">Status: {placedOrder.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-[#E1E8DE]">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To (Customer)</h3>
              <p className="font-bold text-gray-900 text-sm leading-snug">{placedOrder.customerInfo.name}</p>
              {placedOrder.customerInfo.email && (
                <p className="text-xs text-[#2D5A27] mt-0.5">{placedOrder.customerInfo.email}</p>
              )}
              <p className="text-xs text-gray-600 mt-0.5">Phone: {placedOrder.customerInfo.phone}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shipping Address</h3>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                {placedOrder.customerInfo.address}
              </p>
            </div>
          </div>

          <div className="py-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E1E8DE] bg-gray-50">
                    <th className="py-2 px-3 font-semibold text-gray-600">Product</th>
                    <th className="py-2 px-3 font-semibold text-gray-600 text-center w-16">Qty</th>
                    <th className="py-2 px-3 font-semibold text-gray-600 text-right w-24">Price</th>
                    <th className="py-2 px-3 font-semibold text-gray-600 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {placedOrder.items.map((item: any) => {
                    const prod = products.find(p => p.id === item.productId);
                    return (
                      <tr key={item.productId} className="text-gray-700">
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {prod ? prod.name : `Product ID: ${item.productId}`}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-800">{item.quantity}</td>
                        <td className="py-3 px-3 text-right text-gray-800">₹{(prod?.price || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-900">
                          ₹{((prod?.price || 0) * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E1E8DE] flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{(placedOrder.totalAmount - (placedOrder.totalAmount > 50 ? 50 : 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>₹{placedOrder.totalAmount > 50 ? 50 : 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#2D5A27] bg-[#E9F0E6] p-2.5 rounded-lg border border-[#DCE4D8]">
                <span>Total Due</span>
                <span>₹{placedOrder.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-dashed border-[#E1E8DE] text-center text-[10px] text-gray-400">
            <p className="font-medium text-gray-500 mb-0.5">Thank you for your purchase with Shahnawaz Pasu Ahaar Center!</p>
            <p>For inquiries, please reach out to us referencing Order No: #{placedOrder.id}</p>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="bg-white rounded-full p-8 shadow-sm border border-gray-100 mb-6">
          <ShoppingCart className="h-20 w-20 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('empty_cart')}</h2>
        <button 
          onClick={() => setView('shop')}
          className="bg-[#2D5A27] hover:bg-[#23471E] text-white font-medium px-6 py-3 rounded-xl transition-all shadow-sm flex items-center space-x-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Return to Shop</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setView('shop')}
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('cart')}</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E1E8DE] overflow-hidden">
        <ul className="divide-y divide-[#E1E8DE]">
          {cartItems.map((item) => (
            <li key={item.productId} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center space-x-4 flex-1 group">
                <div className="h-16 w-16 bg-[#F4F7F2] rounded-lg flex items-center justify-center flex-shrink-0 border border-transparent group-hover:border-[#DCE4D8] transition-colors overflow-hidden">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Leaf className="h-8 w-8 text-[#A5C09D]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 leading-tight">{item.product.name}</h3>
                  <div className="text-[11px] text-gray-500">
                    ₹{item.product.price} x {item.quantity}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6">
                <div className="flex items-center border border-[#DCE4D8] rounded bg-white">
                  <button 
                    onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                    className="px-3 py-1.5 text-xs hover:bg-[#F4F7F2] rounded-l transition-all font-medium"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800 text-xs">{item.quantity}</span>
                  <button 
                    onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="px-3 py-1.5 text-xs hover:bg-[#F4F7F2] rounded-r transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-base font-bold text-gray-900 w-20 text-right">
                  ₹{item.product.price * item.quantity}
                </div>

                <button 
                  onClick={() => removeFromCart(item.productId)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="bg-[#F9FBF8] p-6 sm:p-8 border-t border-[#E1E8DE] flex flex-col sm:flex-row justify-between items-start gap-8">
          <div className="w-full sm:w-auto min-w-[240px]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-800">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mb-4 pb-4 border-b border-[#DCE4D8]">
              <span className="text-gray-500 flex items-center gap-1.5"><Truck className="w-4 h-4"/> Delivery Fee</span>
              <span className="font-medium text-gray-800">₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-[#2D5A27] mb-2">
              <span>{t('total')}</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-full sm:max-w-md flex-1">
            {!isCheckingOut ? (
              <button 
                onClick={() => setIsCheckingOut(true)}
                className="w-full bg-[#2D5A27] hover:bg-[#23471E] text-white font-bold text-base px-8 py-4 rounded-xl shadow-md shadow-green-100 transition-all flex items-center justify-center space-x-2 transform active:scale-95"
              >
                <span>{t('pay_upi')}</span>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="bg-white p-5 rounded-xl border border-[#DCE4D8] animate-fade-in space-y-4 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2">{t('delivery_details' as any)}</h3>
                
                <div>
                  <input required type="text" placeholder={t('full_name' as any)} value={deliveryDetails.name} onChange={e => setDeliveryDetails(d => ({ ...d, name: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none text-sm transition-all" />
                </div>
                <div>
                  <input required type="email" placeholder="Email Address" value={deliveryDetails.email} onChange={e => setDeliveryDetails(d => ({ ...d, email: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none text-sm transition-all" />
                </div>
                <div>
                  <input required type="tel" placeholder={t('phone_number' as any)} value={deliveryDetails.phone} onChange={e => setDeliveryDetails(d => ({ ...d, phone: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none text-sm transition-all" />
                </div>
                <div className="relative">
                  <textarea required rows={2} placeholder={t('delivery_address' as any)} value={deliveryDetails.address} onChange={e => setDeliveryDetails(d => ({ ...d, address: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none text-sm transition-all pr-12"></textarea>
                  <button type="button" onClick={handleGetCurrentLocation} disabled={isLocating} className="absolute right-2 top-2 p-2 text-gray-400 hover:text-[#2D5A27] bg-white rounded-md shadow-sm border border-gray-200 transition-colors disabled:opacity-50" title="Use current location">
                    <MapPin className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                  </button>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsCheckingOut(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors">
                      Back
                    </button>
                    <button type="submit" className="flex-[2] bg-[#2D5A27] hover:bg-[#23471E] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('proceed_to_pay' as any)}</span>
                    </button>
                  </div>
                  <button type="button" onClick={handleWhatsAppOrderClick} className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 py-3 shadow-sm transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span>Order via WhatsApp</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Confirm Your Order</h2>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto w-full">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold text-gray-900">Name:</span> {deliveryDetails.name}</p>
                  <p><span className="font-semibold text-gray-900">Email:</span> {deliveryDetails.email}</p>
                  <p><span className="font-semibold text-gray-900">Phone:</span> {deliveryDetails.phone}</p>
                  <p><span className="font-semibold text-gray-900">Address:</span> {deliveryDetails.address}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Order Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <ul className="space-y-3 mb-4">
                    {cartItems.map((item) => (
                      <li key={item.productId} className="flex justify-between text-gray-700">
                        <span className="flex-1 pr-4">{item.quantity}x {item.product.name}</span>
                        <span className="font-medium text-gray-900">₹{item.product.price * item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-gray-200 flex justify-between text-gray-700 mb-2">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 mb-3 pb-3 border-b border-gray-200">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#E9F0E6] p-3 rounded-lg">
                    <span className="font-bold text-[#2D5A27] text-base">Total Payment</span>
                    <span className="font-bold text-[#2D5A27] text-lg">₹{total}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmOrder}
                className={`flex-[2] py-3 px-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  checkoutAction === 'whatsapp' 
                    ? 'bg-[#25D366] hover:bg-[#1DA851]' 
                    : 'bg-[#2D5A27] hover:bg-[#23471E]'
                }`}
              >
                {checkoutAction === 'whatsapp' ? (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>Confirm & Send via WhatsApp</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm & Pay Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col items-center p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Scan to Pay</h2>
            <p className="text-gray-500 mb-6 text-sm">Please scan this QR code with any UPI app to complete your payment.</p>
            
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-6">
              <QRCodeSVG 
                value={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR`} 
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
            
            <div className="text-2xl font-bold text-[#2D5A27] mb-6">₹{total}</div>

            <div className="flex flex-col gap-3 w-full">
              <a 
                href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR`}
                className="w-full sm:hidden py-3 px-4 bg-[#2D5A27] hover:bg-[#23471E] text-white rounded-xl font-bold transition-colors text-center shadow-sm"
              >
                Pay with UPI App
              </a>
              <button 
                onClick={finalizeOrder}
                className="w-full py-3 px-4 bg-[#F4F7F2] hover:bg-[#E1E8DE] text-[#2D5A27] border border-[#DCE4D8] rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                I've made the payment
              </button>
              <button 
                onClick={() => setShowUpiModal(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors mt-2"
              >
                Cancel and go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
