import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  Users, 
  ShieldAlert, 
  Plus, 
  Moon, 
  Sun,
  MapPin,
  Tag
} from 'lucide-react';

export interface DebtItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  neighborhood: string;
  category: string;
  due_date: string;
  created_at: string;
  note?: string;
}

interface DebtDashboardScreenProps {
  debts: DebtItem[];
  onAddNew: () => void;
  onRefresh: () => void;
}

type SortField = 'customer_name' | 'amount' | 'due_date';
type SortOrder = 'asc' | 'desc';

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'error' | 'success' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    const haptic = (window as any).Telegram.WebApp.HapticFeedback;
    if (style === 'error' || style === 'success') {
      haptic.notificationOccurred(style);
    } else {
      haptic.impactOccurred(style);
    }
  }
};

export const DebtDashboardScreen: React.FC<DebtDashboardScreenProps> = ({
  debts,
  onAddNew,
  onRefresh
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('Barchasi');
  const [selectedCategory, setSelectedCategory] = useState<string>('Barchasi');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Unique neighborhoods & categories for filter chips
  const neighborhoods = useMemo(() => {
    const set = new Set(debts.map(d => d.neighborhood).filter(Boolean));
    return ['Barchasi', ...Array.from(set)];
  }, [debts]);

  const categories = useMemo(() => {
    const set = new Set(debts.map(d => d.category).filter(Boolean));
    return ['Barchasi', ...Array.from(set)];
  }, [debts]);

  // Due date status calculator
  const getDueStatus = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: 'O\'tib ketgan', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    } else if (diffDays <= 3) {
      return { status: 'warning', label: `${diffDays === 0 ? 'Bugun' : `${diffDays} kun qoldi`}`, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    } else {
      return { status: 'safe', label: `${diffDays} kun bor`, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
  };

  // KPI Calculations
  const kpiStats = useMemo(() => {
    let totalAmount = 0;
    let expiredAmount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    debts.forEach(d => {
      totalAmount += d.amount;
      const due = new Date(d.due_date);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() < today.getTime()) {
        expiredAmount += d.amount;
      }
    });

    return {
      totalAmount,
      activeCount: debts.length,
      expiredAmount,
    };
  }, [debts]);

  // Filter and Sort Logic
  const filteredAndSortedDebts = useMemo(() => {
    let result = [...debts];

    // Live search by name or phone
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.customer_name.toLowerCase().includes(q) || 
        d.customer_phone.toLowerCase().includes(q)
      );
    }

    // Neighborhood filter
    if (selectedNeighborhood !== 'Barchasi') {
      result = result.filter(d => d.neighborhood === selectedNeighborhood);
    }

    // Category filter
    if (selectedCategory !== 'Barchasi') {
      result = result.filter(d => d.category === selectedCategory);
    }

    // Sorting (Fixed syntax error here)
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [debts, searchQuery, selectedNeighborhood, selectedCategory, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    triggerHaptic('light');
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Excel CSV Export
  const exportToCSV = () => {
    triggerHaptic('success');
    const headers = ['Mijoz Ismi', 'Telefon', 'Summa (UZS)', 'Mahalla', 'Toifa', 'Muddati', 'Izoh'];
    const rows = filteredAndSortedDebts.map(d => [
      `"${d.customer_name}"`,
      `"${d.customer_phone}"`,
      d.amount,
      `"${d.neighborhood || ''}"`,
      `"${d.category || ''}"`,
      d.due_date,
      `"${d.note || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nasiyalar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Telegram Reminder Share
  const sendTelegramReminder = (debt: DebtItem) => {
    triggerHaptic('medium');
    const text = `Hurmatli ${debt.customer_name}, Sizning ${new Intl.NumberFormat('uz-UZ').format(debt.amount)} so'm nasiya to'lov muddati (${debt.due_date}) yaqinlashdi / o'tdi. Iltimos, qarzni o'z vaqtida yoping. Rahmat!`;
    const url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 flex flex-col ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Header */}
      <header className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md ${
        isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'
      }`}>
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-500" />
          <h1 className="font-bold text-lg">Nasiya Daftari</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            title="CSV ga eksport qilish"
            className={`p-2.5 rounded-xl border transition active:scale-95 flex items-center gap-1.5 text-xs font-semibold ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-emerald-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel (CSV)</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setIsDarkMode(!isDarkMode);
            }}
            className={`p-2.5 rounded-xl border transition active:scale-95 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-5">

        {/* KPI Panel */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Jami Qarz</span>
              <Wallet className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-indigo-500 truncate">
              {new Intl.NumberFormat('uz-UZ').format(kpiStats.totalAmount)}
            </div>
            <span className="text-[10px] text-slate-500">so'm</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Aktivlar</span>
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-sky-400">
              {kpiStats.activeCount} ta
            </div>
            <span className="text-[10px] text-slate-500">mijoz</span>
          </div>

          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Xavfli / O'tgan</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-rose-500 truncate">
              {new Intl.NumberFormat('uz-UZ').format(kpiStats.expiredAmount)}
            </div>
            <span className="text-[10px] text-slate-500">so'm</span>
          </div>
        </div>

        {/* Action Add Bar & Search */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mijoz ismi yoki tel bo'yicha qidirish..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                onAddNew();
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Yangi Nasiya</span>
            </button>
          </div>

          {/* Neighborhood Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {neighborhoods.map(n => (
              <button
                key={n}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedNeighborhood(n);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                  selectedNeighborhood === n
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                📍 {n}
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(c);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition border ${
                  selectedCategory === c
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🏷️ {c}
              </button>
            ))}
          </div>
        </div>

        {/* Windows Explorer Style Sorting Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold text-slate-400 ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/80 border-slate-200'
        }`}>
          <span>Saralash ustunlari:</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSort('customer_name')}
              className={`flex items-center gap-1 hover:text-indigo-400 transition ${sortField === 'customer_name' ? 'text-indigo-400 font-bold' : ''}`}
            >
              Ism {sortField === 'customer_name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('amount')}
              className={`flex items-center gap-1 hover:text-indigo-400 transition ${sortField === 'amount' ? 'text-indigo-400 font-bold' : ''}`}
            >
              Summa {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('due_date')}
              className={`flex items-center gap-1 hover:text-indigo-400 transition ${sortField === 'due_date' ? 'text-indigo-400 font-bold' : ''}`}
            >
              Muddat {sortField === 'due_date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Debt List Cards */}
        <div className="flex flex-col gap-3 pb-8">
          {filteredAndSortedDebts.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <p className="text-sm font-medium">Nasiyalar topilmadi</p>
            </div>
          ) : (
            filteredAndSortedDebts.map(debt => {
              const dueInfo = getDueStatus(debt.due_date);
              return (
                <div 
                  key={debt.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3 transition shadow-sm ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base">{debt.customer_name}</h3>
                      <p className="text-xs text-slate-400">{debt.customer_phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-indigo-500">
                        {new Intl.NumberFormat('uz-UZ').format(debt.amount)} so'm
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${dueInfo.color}`}>
                        {dueInfo.status === 'expired' && <AlertTriangle className="w-3 h-3" />}
                        {dueInfo.status === 'warning' && <Clock className="w-3 h-3" />}
                        {dueInfo.status === 'safe' && <CheckCircle2 className="w-3 h-3" />}
                        {dueInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Meta tags */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      {debt.neighborhood && (
                        <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg text-[11px]">
                          <MapPin className="w-3 h-3" /> {debt.neighborhood}
                        </span>
                      )}
                      {debt.category && (
                        <span className="flex items-center gap-1 bg-slate-500/10 text-slate-300 px-2 py-0.5 rounded-lg text-[11px]">
                          <Tag className="w-3 h-3" /> {debt.category}
                        </span>
                      )}
                    </div>

                    {/* Telegram Reminder Button */}
                    <button
                      onClick={() => sendTelegramReminder(debt)}
                      className="p-2 rounded-xl bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95"
                      title="Telegram orqali eslatma yuborish"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Eslatish</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

    </div>
  );
};

export default DebtDashboardScreen;