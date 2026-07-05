import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Order } from './types';
import { INITIAL_PRODUCTS } from './data';
import { Language, translations } from './i18n';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as firebaseLogout, getAccessToken } from './auth';
import { setupPushNotifications, triggerLocalNotification } from './notifications';

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  language: Language;
  isAdmin: boolean;
  currentUser: User | null;
  adminProfilePic: string | null;
  setAdminProfilePic: (pic: string | null) => void;
  t: (key: keyof typeof translations.en) => string;
  setLanguage: (lang: Language) => void;
  loginAdmin: (email: string, pass: string) => boolean;
  changeAdminPassword: (newPass: string) => void;
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
  placeOrder: (order: Omit<Order, 'id' | 'date' | 'status'>, initialStatus?: Order['status']) => Promise<string>;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  cancelOrder: (orderId: string) => Promise<boolean>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  authError: { code: string; message: string; domain?: string } | null;
  setAuthError: (error: { code: string; message: string; domain?: string } | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [authError, setAuthError] = useState<{ code: string; message: string; domain?: string } | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

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
  const [adminProfilePic, setAdminProfilePic] = useState<string | null>(() => {
    return localStorage.getItem('adminProfilePic');
  });

  useEffect(() => {
    if (adminProfilePic) {
      localStorage.setItem('adminProfilePic', adminProfilePic);
    } else {
      localStorage.removeItem('adminProfilePic');
    }
  }, [adminProfilePic]);

  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      setCurrentUser(user);
      if (user) {
        // Sync to MongoDB
        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          })
        }).catch(err => console.error("Error syncing user:", err));
      }
    }, () => {
      setCurrentUser(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Register push notifications when app mounts or user logs in/out
    const email = currentUser?.email || undefined;
    const uid = currentUser?.uid || undefined;
    setupPushNotifications(email, uid);
  }, [currentUser]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map((p: any) => ({
            id: p.id || p._id,
            name: p.name,
            category: p.category,
            description: p.description,
            price: p.price,
            stock: p.stock,
            icon: p.icon,
            imageUrl: p.imageUrl
          })));
        }
      })
      .catch(err => console.error("Error loading products from MongoDB:", err));

    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
        }
      })
      .catch(err => console.error("Error loading orders from MongoDB:", err));
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

  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('adminPassword') || 'admin123');

  useEffect(() => {
    localStorage.setItem('adminPassword', adminPassword);
  }, [adminPassword]);

  const loginAdmin = (email: string, pass: string) => {
    if (email === 'saqibjamal723@gmail.com' && pass === adminPassword) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const changeAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    alert('Admin password updated successfully');
  };

  const logoutAdmin = () => setIsAdmin(false);

  const loginCustomer = async () => {
    try {
      setAuthError(null);
      await googleSignIn(false);
    } catch (err: any) {
      console.error("Login customer error caught in context:", err);
      setAuthError({
        code: err.code || 'unknown',
        message: err.message || String(err),
        domain: window.location.hostname
      });
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

  const placeOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status'>, initialStatus: Order['status'] = 'Pending Payment'): Promise<string> => {
    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      date: new Date().toISOString(),
      status: initialStatus
    };
    setOrders(prev => [newOrder, ...prev]);

    // Sync to MongoDB database and wait for it to complete
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      if (!response.ok) {
        console.error("Failed to sync order to MongoDB");
      }
    } catch (err) {
      console.error("Error syncing order to MongoDB:", err);
    }

    return newOrder.id;
  };

  const sendOrderStatusEmail = async (order: Order, newStatus: string) => {
    const token = await getAccessToken();
    if (!token) {
      console.warn("No Google Workspace token available; unable to send automatic status email.");
      return;
    }
    
    const recipient = order.customerInfo.email;
    if (!recipient) {
      console.warn("No email provided in customer information; skipping automatic email status send.");
      return;
    }

    const subject = `Order #${order.id} update: Now ${newStatus}!`;
    
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E1E8DE; border-radius: 12px; background-color: #F9FBF8;">
        <h2 style="color: #2D5A27; text-align: center; border-bottom: 2px solid #2D5A27; padding-bottom: 10px;">Order Status Update</h2>
        <p>Hello <strong>${order.customerInfo.name}</strong>,</p>
        <p>Your order <strong>#${order.id}</strong> has been updated. Its status is now <strong>${newStatus}</strong>.</p>
        
        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #DCE4D8;">
          <h3 style="margin-top: 0; color: #2C3E2D;">Delivery Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${order.customerInfo.name}</p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.customerInfo.phone}</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${order.customerInfo.address}</p>
        </div>

        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #DCE4D8;">
          <h3 style="margin-top: 0; color: #2C3E2D;">Order Status Summary</h3>
          <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="background-color: ${newStatus === 'Processing' ? '#FEF3C7' : '#D1FAE5'}; color: ${newStatus === 'Processing' ? '#92400E' : '#065F46'}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">${newStatus}</span></p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${order.totalAmount.toLocaleString()}</p>
        </div>

        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #E1E8DE; padding-top: 15px;">
          Thank you for shopping with us!<br>
          This email was sent automatically on behalf of the store.
        </p>
      </div>
    `;

    const emailContent = [
      `To: ${recipient}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body
    ].join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gmail send API error detailed:', errorData);
      } else {
        console.log(`Automatic email update successfully sent to ${recipient} for order #${order.id}`);
      }
    } catch (error) {
      console.error('Failed to send auto-gmail update:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    let orderToEmail: Order | null = null;
    let oldStatus: Order['status'] | null = null;

    setOrders(prev => {
      const order = prev.find(o => o.id === orderId);
      if (order) {
        orderToEmail = order;
        oldStatus = order.status;
      }
      return prev.map(o => o.id === orderId ? { ...o, status } : o);
    });

    // Async sync status to MongoDB database
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(err => console.error("Error syncing status update to MongoDB:", err));

    if (orderToEmail && oldStatus) {
      const isFromPending = oldStatus.startsWith('Pending');
      const isTargetStatus = status === 'Processing' || status === 'Delivered';
      if (isFromPending && isTargetStatus && (orderToEmail as Order).customerInfo.email) {
        try {
          await sendOrderStatusEmail(orderToEmail, status);
        } catch (err) {
          console.error("Failed to send order status email automatically:", err);
        }
      }

      // Trigger local push notification fallback when status transitions from Processing to Shipped
      if (oldStatus === 'Processing' && status === 'Shipped') {
        try {
          await triggerLocalNotification(
            "Order Shipped! 🚚",
            `Good news! Your order #${orderId} has been shipped and is on its way.`,
            orderId
          );
        } catch (err) {
          console.error("Failed to send fallback local push notification:", err);
        }
      }
    }
  };

  const cancelOrder = async (orderId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error canceling order:", err);
      // Fallback: update local state anyway so user feels immediate effect
      setOrders(prev => prev.filter(o => o.id !== orderId));
      return false;
    }
  };

  return (
    <StoreContext.Provider value={{
      products, cart, orders, language, isAdmin, currentUser, adminProfilePic, t,
      setAdminProfilePic, setLanguage, loginAdmin, changeAdminPassword, logoutAdmin, loginCustomer, logoutCustomer,
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      addProduct, updateProduct, deleteProduct,
      placeOrder, updateOrderStatus, cancelOrder,
      theme, toggleTheme,
      authError, setAuthError
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
