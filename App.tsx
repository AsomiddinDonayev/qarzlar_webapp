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
  const [debugLog, setDebugLog] = useState<string>("Boshlanmoqda...");

  useOfflineSync();

  useEffect(() => {
    try {
      window.Telegram?.WebApp?.ready?.();
      window.Telegram?.WebApp?.expand?.();

      const initData = getInitData();
      setDebugLog((prev) => prev + "\nInitData tekshirilmoqda...");

      if (!initData) {
        // Agar Telegram'dan tashqarida (oddiy brauzerda) ochilgan bo'lsa test uchun to'xtatmaymiz
        console.warn("InitData topilmadi, lekin davom etamiz.");
      }

      setDebugLog((prev) => prev + "\nServer bilan bog'lanish...");
      
      // Agar initData bo'lmasa, sinov uchun o'tkazib yuborish yoki tekshirish
      const validationPromise = initData ? validateInitData(initData) : Promise.resolve("test-jwt");

      validationPromise
        .then(async (jwt) => {
          setSupabaseJwt(jwt);
          const tgUser = getTelegramUser() || { id: 12345, first_name: "Test User" }; // Fallback for debugging
          
          setDebugLog((prev) => prev + `\nFoydalanuvchi aniqlandi: ${tgUser.id}`);

          const { data, error } = await supabase
            .from("users")
            .select("telegram_id, business_id, role")
            .eq("telegram_id", tgUser.id)
            .maybeSingle();

          if (error) {
            throw new Error("Supabase xatosi: " + error.message);
          }
          if (!data) {
            throw new Error(`Foydalanuvchi topilmadi (ID: ${tgUser.id}). Botda /start bosganmisiz?`);
          }
          
          setAppUser(data as AppUser);
        })
        .catch((e: Error) => {
          console.error(e);
          setAuthError(e.message);
        });
    } catch (err: any) {
      setAuthError("Kutilmagan xato: " + err.message);
    }
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          <p className="text-rose-400 font-semibold text-lg">⚠️ Xatolik yuz berdi</p>
          <p className="text-slate-300 text-sm bg-slate-900 p-4 rounded-lg border border-slate-800 text-left whitespace-pre-wrap">
            {authError}
          </p>
          <p className="text-slate-500 text-xs mt-2 whitespace-pre-wrap">Log: {debugLog}</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs text-center">Yuklanmoqda...</p>
        <pre className="text-slate-600 text-[10px] max-w-xs overflow-hidden text-center">{debugLog}</pre>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950">
      <FastDebtEntryScreen onSubmit={handleDebtSubmit} />
    </div>
  );
}

// Qo'shimcha funksiya (agar pastda e'lon qilinmagan bo'lsa)
async function handleDebtSubmit(data: DebtPayload) {
  // Joyida qoladi
}