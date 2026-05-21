import React from 'react';
import { useStore } from '../StoreContext';
import { Trash2, Plus, Minus, ArrowLeft, CheckCircle2, ShoppingCart, Leaf } from 'lucide-react';

export function Cart({ setView }: { setView: (v: any) => void }) {
  const { cart, products, updateCartQuantity, removeFromCart, clearCart, t } = useStore();

  const cartItems = cart.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)!
  })).filter(item => item.product);

  const total = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({
            name: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
            imageUrl: i.product.imageUrl
          }))
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

        <div className="bg-[#F9FBF8] p-6 sm:p-8 border-t border-[#E1E8DE] flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="w-full sm:w-auto min-w-[200px]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-800">₹{total}</span>
            </div>
            <div className="flex justify-between text-sm mb-3 pb-3 border-b border-[#DCE4D8]">
              <span className="text-gray-500">GST (5%)</span>
              <span className="font-medium text-gray-800">₹{(total * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#2D5A27]">
              <span>{t('total')}</span>
              <span>₹{(total * 1.05).toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full sm:w-auto bg-[#2D5A27] hover:bg-[#23471E] text-white font-bold text-base px-8 py-4 rounded-xl shadow-md shadow-green-100 transition-all flex items-center justify-center space-x-2 transform active:scale-95"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{t('pay_upi')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
