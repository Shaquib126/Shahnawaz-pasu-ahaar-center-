import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { X } from 'lucide-react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useStore();

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 p-4 sm:p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 pr-4">
          <p className="text-sm text-gray-600 font-medium leading-relaxed">
            We use cookies to improve your experience, personalize content, and analyze site traffic. 
            By clicking "Accept All", you consent to our use of cookies.
          </p>
        </div>
        <div className="flex flex-row gap-3 min-w-max w-full sm:w-auto">
          <button 
            onClick={declineCookies}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={acceptCookies}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-[#2D5A27] hover:bg-[#23471E] rounded-lg shadow-sm transition-colors"
          >
            Accept All
          </button>
        </div>
        <button 
          onClick={declineCookies}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 sm:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
