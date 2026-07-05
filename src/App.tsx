import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './StoreContext';
import { Header } from './components/Header';
import { Shop } from './components/Shop';
import { Cart } from './components/Cart';
import { AdminPanel } from './components/AdminPanel';
import { Login } from './components/Login';
import { CookieConsent } from './components/CookieConsent';
import { MyOrders } from './components/MyOrders';
import { AuthErrorModal } from './components/AuthErrorModal';
import { TrackOrder } from './components/TrackOrder';

type View = 'shop' | 'cart' | 'admin' | 'login' | 'my-orders' | 'track-order';

function MainApp() {
  const [view, setView] = useState<View>('shop');
  const { isAdmin, clearCart, updateOrderStatus, language } = useStore();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const orderId = query.get('order_id');
    
    if (query.get('success')) {
      clearCart();
      if (orderId) {
        updateOrderStatus(orderId, 'Processing');
      }
      alert('Payment successful! Your order has been placed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (query.get('canceled')) {
      alert('Payment canceled. You can try checking out again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clearCart, updateOrderStatus]);

  const tooltipText = language === 'hi' 
    ? 'व्हाट्सएप पूछताछ' 
    : 'WhatsApp Inquiry';
  const welcomeMessage = language === 'hi'
    ? 'नमस्ते, मुझे शाहनवाज पशु आहार केंद्र पर पशु आहार/दवा की उपलब्धता के बारे में पूछताछ करनी है।'
    : 'Hello, I would like to inquire about the availability of cattle feed and medicines at Shahnawaz Pasu Ahaar Center.';
  const whatsappUrl = `https://wa.me/919110000000?text=${encodeURIComponent(welcomeMessage)}`;

  return (
    <div className="min-h-screen bg-[#F4F7F2] text-[#2C3E2D] dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      <Header view={view} setView={setView} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
        {view === 'shop' && <Shop />}
        {view === 'cart' && <Cart setView={setView} />}
        {view === 'admin' && isAdmin && <AdminPanel />}
        {view === 'admin' && !isAdmin && <Login setView={setView} />}
        {view === 'login' && <Login setView={setView} />}
        {view === 'my-orders' && <MyOrders setView={setView} />}
        {view === 'track-order' && <TrackOrder setView={setView} />}
      </main>
      <CookieConsent />
      <AuthErrorModal />

      {view !== 'admin' && (
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center"
          title={tooltipText}
          id="whatsapp-floating-action-button"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping -z-10 group-hover:opacity-0 transition-opacity"></span>
          
          <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.528 2.016 14.069.99 11.45.99c-5.443 0-9.87 4.372-9.874 9.802-.001 1.768.478 3.49 1.387 5.02L1.975 21.8l6.196-1.626z" />
            <path d="M17.487 14.394c-.302-.152-1.787-.882-2.058-.98-.271-.1-.469-.15-.667.15-.198.298-.767.98-.94 1.177-.173.199-.347.223-.649.072-.302-.152-1.273-.47-2.426-1.498-.897-.8-1.502-1.787-1.678-2.09-.176-.302-.019-.465.132-.615.136-.135.302-.35.453-.524.151-.174.2-.298.302-.497.103-.198.05-.373-.025-.524-.075-.152-.667-1.609-.913-2.203-.24-.577-.483-.498-.667-.508-.172-.009-.371-.01-.57-.01-.198 0-.521.074-.794.373-.272.299-1.04 1.016-1.04 2.479 0 1.463 1.063 2.877 1.211 3.076.149.198 2.093 3.2 5.071 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.787-.73 2.039-1.436.252-.706.252-1.312.176-1.436-.076-.124-.272-.198-.574-.351" />
          </svg>
          
          <div className="absolute right-full mr-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 text-gray-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap">
            {tooltipText}
          </div>
        </a>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
