import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Order } from './types';
import { INITIAL_PRODUCTS } from './data';
import { Language, translations } from './i18n';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as firebaseLogout } from './auth';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  language: Language;
  isAdmin: boolean;
  currentUser: User | null;
  t: (key: keyof typeof translations.en) => string;
  setLanguage: (lang: Language) => void;
  loginAdmin: (username: string) => boolean;
  logoutAdmin: () => void;
  loginCustomer: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void;
  deleteProduct: (productId: string) => void;
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => string;
  updateOrderStatus: (id: string, status: Order['status']) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [language, setLanguage] = useState<Language>('en');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setCurrentUser(user);
    }, () => {
      setCurrentUser(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(orders));
  }, [orders]);

  const t = (key: keyof typeof translations.en) => translations[language][key];

  const loginAdmin = (username: string) => {
    if (username === 'admin') {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => setIsAdmin(false);

  const loginCustomer = async () => {
    try {
      const res = await googleSignIn(false);
      if (res?.user) {
        setCurrentUser(res.user);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        alert("Sign-in popup was closed. Please try again or open in new tab.");
      } else {
        alert("Failed to login with Google: " + err.message);
      }
    }
  };

  const logoutCustomer = async () => {
    await firebaseLogout();
    setCurrentUser(null);
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => 
          item.productId === productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Math.random().toString(36).substring(2, 9)
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updatedProduct: Omit<Product, 'id'>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...updatedProduct, id } : p)));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const placeOrder = (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      date: new Date().toISOString(),
      status: 'Pending Payment'
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder.id;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  return (
    <StoreContext.Provider value={{
      products, cart, orders, language, isAdmin, currentUser, t,
      setLanguage, loginAdmin, logoutAdmin, loginCustomer, logoutCustomer,
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      addProduct, updateProduct, deleteProduct,
      placeOrder, updateOrderStatus
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
