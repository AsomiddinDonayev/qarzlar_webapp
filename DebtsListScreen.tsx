// DebtsListScreen.tsx
import React, { useState } from "react";
import { Debt, api } from "./api";

interface Props {
  debts: Debt[];
  onRefresh: () => void;
}

export const DebtsListScreen: React.FC<Props> = ({ debts, onRefresh }) => {
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "active" | "overdue">("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredDebts = debts.filter((d) => {
    const matchesSearch =
      (d.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || "").includes(search);

    if (filter === "active") return matchesSearch && d.status === "active";
    if (filter === "overdue") return matchesSearch && d.status === "overdue";
    return matchesSearch;
  });

  const totalUnpaid = debts
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const handlePay = async (id: string, amount: number) => {
    if (!window.confirm("Qarz so'ndirilsinmi?")) return;
    setLoadingId(id);
    const success = await api.payDebt(id, amount);
    if (success) {
      onRefresh();
    } else {
      alert("To'lovni amalga oshirishda xatolik bo'ldi.");
    }
    setLoadingId(null);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Jami statistika */}
      <div className="p-4 bg-slate-800/90 border border-slate-700/60 rounded-2xl shadow-lg">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
          Jami Nasiya Summasi
        </p>
        <p className="text-2xl font-black text-blue-400 mt-1">
          {totalUnpaid.toLocaleString("uz-UZ")} so'm
        </p>
      </div>

      {/* Qidiruv va Filtr */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Mijoz ismi yoki telefon..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
        />

        <div className="flex gap-2">
          {(["all", "active", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 border border-slate-700/50"
              }`}
            >
              {f === "all" ? "Barchasi" : f === "active" ? "Faol" : "Muddati o'tgan"}
            </button>
          ))}
        </div>
      </div>

      {/* Ro'yxat */}
      <div className="space-y-2">
        {filteredDebts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs bg-slate-800/30 rounded-2xl border border-dashed border-slate-800">
            Qarzdorlar topilmadi.
          </div>
        ) : (
          filteredDebts.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-800 border border-slate-700/60 rounded-xl flex justify-between items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{item.customer_name}</span>
                  {item.status === "overdue" && (
                    <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                      Muddati o'tdi
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{item.phone}</p>
                <div className="text-[10px] text-slate-500 flex gap-2">
                  {item.region && <span>📍 {item.region}</span>}
                  {item.category && <span>🏷️ {item.category}</span>}
                </div>
              </div>

              <div className="text-right">
                <p className="font-black text-red-400 text-sm">
                  {Number(item.amount).toLocaleString("uz-UZ")} so'm
                </p>
                <button
                  onClick={() => handlePay(item.id, item.amount)}
                  disabled={loadingId === item.id || item.status === "paid"}
                  className="mt-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {loadingId === item.id ? "..." : "To'lash"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};