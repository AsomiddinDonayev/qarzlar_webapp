import React, { useEffect, useState } from "react";
import { validateInitData, getInitData, getTelegramUser } from "./api";
import { supabase, setSupabaseJwt } from "./db";
import { useOfflineSync, queueDebt } from "./useOfflineSync";
import { FastDebtEntryScreen, DebtPayload } from "./FastDebtEntryScreen";
import { DebtorsScreen, DebtRecord } from "./DebtorsScreen";
import { ShopProfileScreen, ShopProfileData } from "./ShopProfileScreen";
import { PlusCircle, Users, Store } from "lucide-react";

interface AppUser {
  telegram_id: number;
  business_id: string;
  role: "owner" | "manager";
}

export default function App() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'add-debt' | 'debtors' | 'profile'>('add-debt');
  const [debtorsList, setDebtorsList] = useState<DebtRecord[]>([]);
  const [shopProfile, setShopProfile] = useState<ShopProfileData>({
    shopName: "Mening Do'konim",
    ownerName: "Rahbar",
    phone: "+998 90 000 00 00",
    address: "Markaz",
    category: "Savdo",
    description: "Nasiya savdo ilovasi"
  });

  useOfflineSync();

  // Supabase'dan qarzdorlarni olib kelish funksiyasi
  const fetchDebtors = async (businessId: string) => {
    const { data, error } = await supabase
      .from("debts")
      .select(`
        id,
        amount,
        paid_amount,
        due_date,
        status,
        note,
        customers (
          name,
          phone
        )
      `)
      .eq("business_id", businessId);

    if (error) {
      console.error("Qarzdorlarni olishda xatolik:", error.message);
      return;
    }

    if (data) {
      const formatted: DebtRecord[] = data.map((item: any) => ({
        id: item.id,
        customerName: item.customers?.name || "Noma'lum",
        customerPhone: item.customers?.phone || "",
        amount: item.amount,
        paidAmount: item.paid_amount || 0,
        dueDate: item.due_date,
        status: item.status || 'active',
        category: "Oziq-ovqat",
        neighborhood: "Markaz",
        history: [
          {
            date: item.due_date,
            type: 'debt',
            amount: item.amount,
            note: item.note || "Nasiya"
          }
        ]
      }));
      setDebtorsList(formatted);
    }
  };

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();

    const initData = getInitData();
    if (!initData) {
      setAuthError("Ilovani Telegram ichida oching.");
      return;
    }

    validateInitData(initData)
      .then(async (jwt) => {
        setSupabaseJwt(jwt);
        const tgUser = getTelegramUser();
        if (!tgUser) throw new Error("Foydalanuvchi topilmadi.");

        const { data, error } = await supabase
          .from("users")
          .select("telegram_id, business_id, role")
          .eq("telegram_id", tgUser.id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) throw new Error("Avval botda /start bosing.");
        
        setAppUser(data as AppUser);
        
        // Bazadan qarzdorlarni yuklab olamiz
        await fetchDebtors(data.business_id);
      })
      .catch((e: Error) => setAuthError(e.message));
  }, []);

  const handleDebtSubmit = async (data: DebtPayload) => {
    if (!appUser) throw new Error("Autentifikatsiya xatosi.");

    let customerId: string;
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", appUser.business_id)
      .eq("phone", data.customerPhone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newC, error } = await supabase
        .from("customers")
        .insert({ 
          business_id: appUser.business_id, 
          name: data.customerName, 
          phone: data.customerPhone 
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      customerId = newC.id;
    }

    const dueDate = new Date(data.createdAt);
    dueDate.setDate(dueDate.getDate() + data.dueInDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    if (!navigator.onLine) {
      const pending = {
        id: crypto.randomUUID(),
        business_id: appUser.business_id,
        customer_id: customerId,
        amount: data.amount,
        note: data.note,
        due_date: dueDateStr,
      };
      await queueDebt(pending);
    } else {
      const { error } = await supabase.from("debts").insert({
        business_id: appUser.business_id,
        customer_id: customerId,
        amount: data.amount,
        note: data.note || null,
        due_date: dueDateStr,
      });
      if (error) throw new Error(error.message);
    }

    // Nasiya qo'shilgandan keyin bazadan ro'yxatni yangilab olamiz
    await fetchDebtors(appUser.business_id);
  };

  const handleSaveProfile = async (updatedData: ShopProfileData) => {
    setShopProfile(updatedData);
  };

  const handleCallDebtor = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 select-none">
        <div className="text-center space-y-3">
          <p className="text-rose-400 font-semibold text-lg">⚠️ Xatolik</p>
          <p className="text-slate-400 text-sm">{authError}</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center select-none">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative select-none">
      
      <main className="flex-1 w-full">
        {activeTab === 'add-debt' && (
          <FastDebtEntryScreen onSubmit={handleDebtSubmit} />
        )}
        {activeTab === 'debtors' && (
          <DebtorsScreen debtors={debtorsList} onCall={handleCallDebtor} />
        )}
        {activeTab === 'profile' && (
          <ShopProfileScreen initialData={shopProfile} onSave={handleSaveProfile} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-lg px-6 py-2.5 flex items-center justify-between z-50 shadow-2xl">
        <button
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            setActiveTab('add-debt');
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'add-debt' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PlusCircle className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Yangi nasiya</span>
        </button>

        <button
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
            setActiveTab('debtors');
            // Qarzdorlar sahifasiga o'tganda bazadan yangilab olish uchun:
            if (appUser) fetchDebtors(appUser.business_id);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === 'debtors' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Qarzdorlar</span>
        </button>

        <button
          onClick={() => {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
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
}