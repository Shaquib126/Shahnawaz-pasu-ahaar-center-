import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Lock } from 'lucide-react';

export function Login({ setView }: { setView: (v: any) => void }) {
  const { loginAdmin, t } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(email, password)) {
      setView('admin');
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm border border-[#E1E8DE]">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#E9F0E6] p-3 rounded-full mb-3">
            <Lock className="h-8 w-8 text-[#2D5A27]" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">{t('admin_login')}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none transition-all ${
                error ? 'border-red-300 bg-red-50' : 'border-[#DCE4D8]'
              }`}
              placeholder="saqibjamal723@gmail.com"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#558B4D] focus:border-[#558B4D] outline-none transition-all ${
                error ? 'border-red-300 bg-red-50' : 'border-[#DCE4D8]'
              }`}
              placeholder="••••••••"
              required
            />
            {error && <p className="text-red-500 text-sm mt-1.5 font-medium">Invalid email or password.</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-[#2D5A27] hover:bg-[#23471E] text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
          >
            {t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}
