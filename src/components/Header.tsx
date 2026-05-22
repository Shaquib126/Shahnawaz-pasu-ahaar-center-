import React from 'react';
import { useStore } from '../StoreContext';
import { ShoppingCart, LogIn, LogOut, Settings, Leaf, User } from 'lucide-react';

export function Header({ view, setView }: { view: string, setView: (v: any) => void }) {
  const { cart, language, setLanguage, t, isAdmin, logoutAdmin, currentUser, loginCustomer, logoutCustomer, adminProfilePic } = useStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-[#2D5A27] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('shop')}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Leaf className="h-6 w-6 text-[#2D5A27]" />
            </div>
            <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight leading-tight line-clamp-1 w-40 sm:w-auto">
              {t('shop_title')}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            <button
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-2 bg-[#447A3C] px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#558B4D] transition-colors"
            >
              <span>{language === 'en' ? 'EN' : 'हि'}</span>
              <span className="opacity-40 text-xs">|</span>
              <span className="opacity-70">{language === 'en' ? 'हि' : 'EN'}</span>
            </button>

            <button 
              onClick={() => setView('cart')}
              className="relative p-2 hover:bg-[#447A3C] rounded-full transition-colors opacity-80 hover:opacity-100"
            >
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-[10px] font-bold text-black transform translate-x-1/4 -translate-y-1/4 bg-yellow-500 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="hidden md:block text-sm font-medium opacity-90 truncate max-w-[120px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button 
                  onClick={() => logoutCustomer()}
                  className="p-2 hover:bg-[#447A3C] rounded-full transition-colors text-red-200 hover:text-red-100"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => loginCustomer()}
                className="text-sm font-medium opacity-80 hover:opacity-100 flex items-center gap-1.5 p-2 bg-[#3A6B34] hover:bg-[#447A3C] rounded-lg transition-colors border border-[#447A3C]"
                title="Sign in with Google"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {isAdmin ? (
              <div className="flex items-center space-x-1 sm:space-x-3 border-l border-[#447A3C] pl-2 sm:pl-4">
                <button 
                  onClick={() => setView('admin')}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${view === 'admin' ? 'bg-[#558B4D]' : 'hover:bg-[#447A3C]'}`}
                  title={t('admin_panel')}
                >
                  {adminProfilePic ? (
                    <img src={adminProfilePic} alt="Admin" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <Settings className="h-5 w-5" />
                  )}
                </button>
                <button 
                  onClick={() => { logoutAdmin(); setView('shop'); }}
                  className="p-2 hover:bg-[#447A3C] rounded-full transition-colors text-red-300 hover:text-red-100"
                  title={t('logout')}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="text-xs font-medium opacity-70 hover:opacity-100 p-2 border-l border-[#447A3C] pl-2 sm:pl-4"
                title={t('admin_login')}
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
