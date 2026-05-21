import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './StoreContext';
import { Header } from './components/Header';
import { Shop } from './components/Shop';
import { Cart } from './components/Cart';
import { AdminPanel } from './components/AdminPanel';
import { Login } from './components/Login';

type View = 'shop' | 'cart' | 'admin' | 'login';

function MainApp() {
  const [view, setView] = useState<View>('shop');
  const { isAdmin, clearCart } = useStore();

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      clearCart();
      alert('Payment successful! Your order has been placed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (query.get('canceled')) {
      alert('Payment canceled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-[#F4F7F2] text-[#2C3E2D] font-sans flex flex-col">
      <Header view={view} setView={setView} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
        {view === 'shop' && <Shop />}
        {view === 'cart' && <Cart setView={setView} />}
        {view === 'admin' && isAdmin && <AdminPanel />}
        {view === 'admin' && !isAdmin && <Login setView={setView} />}
        {view === 'login' && <Login setView={setView} />}
      </main>
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
