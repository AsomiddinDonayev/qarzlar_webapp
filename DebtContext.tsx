import React, { createContext, useContext, useState, useEffect } from 'react';
import { DebtRecord } from './DebtorsScreen';
import { DebtPayload } from './FastDebtEntryScreen';
import { ShopProfileData } from './ShopProfileScreen';

interface DebtContextType {
  debtors: DebtRecord[];
  shopProfile: ShopProfileData;
  addDebt: (payload: DebtPayload) => void;
  updateShopProfile: (data: ShopProfileData) => void;
}

const DebtContext = createContext<DebtContextType | undefined>(undefined);

export const DebtProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage dan ma'lumotlarni o'qish yoki boshlang'ich qiymat berish
  const [debtors, setDebtors] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem('shop_debtors');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: '1',
        customerName: 'Anvar Toshmatov',
        customerPhone: '+998 90 123 45 67',
        amount: 450000,
        paidAmount: 150000,
        dueDate: '2026-08-10',
        status: 'active',
        category: 'Oziq-ovqat',
        neighborhood: 'Markaz',
        history: [
          { date: '2026-07-10', type: 'debt', amount: 450000, note: 'Mahsulot olindi' },
          { date: '2026-07-15', type: 'payment', amount: 150000, note: 'Qisman tolov' }
        ]
      }
    ];
  });

  const [shopProfile, setShopProfile] = useState<ShopProfileData>(() => {
    const saved = localStorage.getItem('shop_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      shopName: '"Baraka" Oziq-ovqat',
      ownerName: 'Asomiddin',
      phone: '+998 90 123 45 67',
      address: 'Markaz',
      category: 'Supermarket / Do\'kon',
      description: 'Kundalik oziq-ovqat va xo\'jalik mollari savdosi.'
    };
  });

  // LocalStorage ga saqlab borish
  useEffect(() => {
    localStorage.setItem('shop_debtors', JSON.stringify(debtors));
  }, [debtors]);

  useEffect(() => {
    localStorage.setItem('shop_profile', JSON.stringify(shopProfile));
  }, [shopProfile]);

  const addDebt = (payload: DebtPayload) => {
    const newRecord: DebtRecord = {
      id: Date.now().toString(),
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      amount: payload.amount,
      paidAmount: 0,
      dueDate: new Date(Date.now() + payload.dueInDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      category: payload.category,
      neighborhood: payload.neighborhood,
      history: [
        {
          date: new Date().toISOString().split('T')[0],
          type: 'debt',
          amount: payload.amount,
          note: payload.note || 'Yangi nasiya qo\'shildi'
        }
      ]
    };

    setDebtors(prev => [newRecord, ...prev]);
  };

  const updateShopProfile = (data: ShopProfileData) => {
    setShopProfile(data);
  };

  return (
    <DebtContext.Provider value={{ debtors, shopProfile, addDebt, updateShopProfile }}>
      {children}
    </DebtContext.Provider>
  );
};

export const useDebt = () => {
  const context = useContext(DebtContext);
  if (!context) throw new Error('useDebt must be used within a DebtProvider');
  return context;
};