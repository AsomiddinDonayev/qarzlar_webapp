// App.tsx
import { useState, useEffect } from "react";
import FastDebtEntryScreen from "./FastDebtEntryScreen";
import { DebtsListScreen } from "./DebtsListScreen";
import { api, Debt } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    loadDebts();
  }, []);

  const loadDebts = async () => {
    setLoading(true);
    const data = await api.getDebts();
    setDebts(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Sarlavha */}
      <header className="p-3.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>📒</span> Nasiya Daftari
          </h1>
          <p className="text-[10px] text-slate-400">Kassa va hisob-kitob tizimi</p>
        </div>
        <button
          onClick={loadDebts}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700/50"
        >
          🔄 Yangilash
        </button>
      </header>

      {/* Ekranlar */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 text-slate-500 text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Yuklanmoqda...</span>
          </div>
        ) : activeTab === "list" ? (
          <DebtsListScreen debts={debts} onRefresh={loadDebts} />
        ) : (
          <FastDebtEntryScreen
            onSuccess={() => {
              loadDebts();
              setActiveTab("list");
            }}
          />
        )}
      </main>

      {/* Pastki menyu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 p-2 flex justify-around z-20 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2 flex flex-col items-center justify-center rounded-xl transition ${
            activeTab === "list"
              ? "bg-blue-600/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-base">📋</span>
          <span className="text-[10px] mt-0.5">Qarzdorlar</span>
        </button>

        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 py-2 flex flex-col items-center justify-center rounded-xl transition ${
            activeTab === "add"
              ? "bg-blue-600/20 text-blue-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="text-base">➕</span>
          <span className="text-[10px] mt-0.5">Yangi Nasiya</span>
        </button>
      </nav>
    </div>
  );
}