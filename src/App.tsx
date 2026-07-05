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
  const { isAdmin, clearCart, updateOrderStatus } = useStore();

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
