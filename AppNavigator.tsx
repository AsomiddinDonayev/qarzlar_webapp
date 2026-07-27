import React, { useState } from 'react';
import { PlusCircle, Users, Store } from 'lucide-react';
import { FastDebtEntryScreen, DebtPayload } from './FastDebtEntryScreen';
import { DebtorsScreen, DebtRecord } from './DebtorsScreen';
import { ShopProfileScreen, ShopProfileData } from './ShopProfileScreen';

const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
};

export const AppNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add-debt' | 'debtors' | 'profile'>('add-debt');

  // Sample handlers for actions
  const handleAddDebtSubmit = async (data: DebtPayload) => {
    // Bu yerda API orqali ma'lumotlarni saqlash amallari bajariladi
    console.log("Yangi nasiya ma'lumotlari:", data);
    return Promise.resolve();
  };

  const handleSaveProfile = async (data: ShopProfileData) => {
    // Profil ma'lumotlarini saqlash
    console.log("Yangilangan profil:", data);
    return Promise.resolve();
  };

  const handleCallDebtor = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative pb-16">
      
      {/* Active Tab Content Screen */}
      <main className="flex-1 w-full">
        {activeTab === 'add-debt' && (
          <FastDebtEntryScreen 
            onSubmit={handleAddDebtSubmit} 
          />
        )}

        {activeTab === 'debtors' && (
          <DebtorsScreen 
            onCall={handleCallDebtor}
          />
        )}

        {activeTab === 'profile' && (
          <ShopProfileScreen 
            onSave={handleSaveProfile}
          />
        )}
      </main>

      {/* Telegram Mini App Style Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-lg px-6 py-2.5 flex items-center justify-between z-50 shadow-2xl">
        
        {/* Yangi Nasiya Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('add-debt');
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'add-debt' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PlusCircle className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Yangi nasiya</span>
        </button>

        {/* Qarzdorlar Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('debtors');
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'debtors' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Qarzdorlar</span>
        </button>

        {/* Do'kon Profili Tab */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('profile');
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'profile' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Store className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Do'kon profili</span>
        </button>

      </nav>

    </div>
  );
};

export default AppNavigator;