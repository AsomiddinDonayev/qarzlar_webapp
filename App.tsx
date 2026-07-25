import React, { useEffect, useState } from "react";
import { validateInitData, getInitData, getTelegramUser } from "./api";
import { supabase, setSupabaseJwt } from "./db";
import { useOfflineSync, queueDebt } from "./useOfflineSync";
import FastDebtEntryScreen, { DebtPayload } from "./FastDebtEntryScreen";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: { user?: { id: number; first_name: string; username?: string } };
        expand?: () => void;
        ready?: () => void;
        HapticFeedback?: {
          impactOccurred: (s: string) => void;
          notificationOccurred: (s: string) => void;
        };
      };
    };
  }
}

interface AppUser {
  telegram_id: number;
  business_id: string;
  role: "owner" | "manager";
}

export default function App() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useOfflineSync();

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
      })
      .catch((e: Error) => setAuthError(e.message));
  }, []);

  const handleDebtSubmit = async (data: DebtPayload) => {
    if (!appUser) throw new Error("Autentifikatsiya xatosi.");

    // Upsert customer by phone within this business
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
        .insert({ business_id: appUser.business_id, name: data.customerName, phone: data.customerPhone })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      customerId = newC.id;
    }

    const dueDate = new Date(data.createdAt);
    dueDate.setDate(dueDate.getDate() + data.dueInDays);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    if (!navigator.onLine) {
      // Queue for offline sync
      const pending = {
        id: crypto.randomUUID(),
        business_id: appUser.business_id,
        customer_id: customerId,
        amount: data.amount,
        note: data.note,
        due_date: dueDateStr,
      };
      await queueDebt(pending);
      return; // success — will sync when online
    }

    const { error } = await supabase.from("debts").insert({
      business_id: appUser.business_id,
      customer_id: customerId,
      amount:      data.amount,
      note:        data.note || null,
      due_date:    dueDateStr,
    });
    if (error) throw new Error(error.message);
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-rose-400 font-semibold text-lg">⚠️ Xatolik</p>
          <p className="text-slate-400 text-sm">{authError}</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950">
      <FastDebtEntryScreen onSubmit={handleDebtSubmit} />
    </div>
  );
}
