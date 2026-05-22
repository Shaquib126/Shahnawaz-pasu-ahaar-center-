import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { Trash2, Plus, Minus, ArrowLeft, CheckCircle2, ShoppingCart, Leaf, Truck, MapPin, MessageCircle, X } from 'lucide-react';

export function Cart({ setView }: { setView: (v: any) => void }) {
  const { cart, products, updateCartQuantity, removeFromCart, clearCart, t, placeOrder, currentUser } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    name: currentUser?.displayName || '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (currentUser?.displayName && !deliveryDetails.name) {
      setDeliveryDetails(d => ({ ...d, name: currentUser.displayName || '' }));
    }
  }, [currentUser]);

  const [isLocating, setIsLocating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState<'pay' | 'whatsapp' | null>(null);

  const cartItems = cart.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)!
  })).filter(item => item.product);

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const deliveryFee = 50; // Fixed delivery fee
  const total = subtotal + deliveryFee;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Simple reverse geocoding via free nominatim API (For demo purposes)
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
      (error) => {
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const handleWhatsAppOrderClick = () => {
    if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address) {
      alert("Please fill in your delivery details first.");
      return;
    }
    setCheckoutAction('whatsapp');
    setShowConfirmModal(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDetails.name || !deliveryDetails.phone || !deliveryDetails.address) return;
    setCheckoutAction('pay');
    setShowConfirmModal(true);
  };

  const processWhatsAppOrder = () => {
    const itemsText = cartItems.map(item => 
      `- ${item.product.name} (x${item.quantity}) - ₹${item.product.price * item.quantity}`
    ).join('%0A');

    const message = `Hello! I would like to place an order:%0A%0A${itemsText}%0A%0ASubtotal: ₹${subtotal}%0ADelivery Fee: ₹${deliveryFee}%0A*Total: ₹${total}*%0A%0A*Delivery Details:*%0AName: ${deliveryDetails.name}%0APhone: ${deliveryDetails.phone}%0AAddress: ${deliveryDetails.address}`;

    placeOrder({
      items: cart,
      customerInfo: deliveryDetails,
      totalAmount: total
    });
    
    clearCart();

    const whatsappUrl = `https://wa.me/9196169461?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setView('shop');
  };

  const processStripePayment = async () => {
    try {
      // 1. Create a pending order internally
      const orderId = placeOrder({
        items: cart,
        customerInfo: deliveryDetails,
        totalAmount: total
      });

      // 2. Add a delivery fee proxy item for Stripe
      const stripeItems = cartItems.map(i => ({
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        imageUrl: i.product.imageUrl
      }));
      
      stripeItems.push({
        name: "Delivery Service Fee",
        price: deliveryFee,
        quantity: 1,
        imageUrl: undefined
      });

      // 3. Initiate checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: stripeItems,
          orderId: orderId
        })
      });

      const data = await response.json();
      
      if (data.error) {
        alert('Payment Error: ' + data.error + '\n\nPlease configure STRIPE_SECRET_KEY in AI Studio settings.');
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Failed to initiate checkout.');
    }
  };

  const confirmOrder = async () => {
    setShowConfirmModal(false);
    if (checkoutAction === 'whatsapp') {
      processWhatsAppOrder();
    } else if (checkoutAction === 'pay') {
      await processStripePayment();
    }
  };

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
    </div>
  );
}
