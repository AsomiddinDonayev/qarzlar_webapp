import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowUpDown, 
  Calendar, 
  DollarSign, 
  User, 
  Search, 
  Filter, 
  Download, 
  Send, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Tag,
  ArrowUp,
  ArrowDown,
  ShieldAlert
} from 'lucide-react';

export type SortField = 'date' | 'amount' | 'name' | 'dueDate';
export type SortOrder = 'asc' | 'desc';

export interface DebtItem {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  createdAt: string; // ISO String
  dueInDays: number;
  neighborhood?: string;
  category?: string;
}

interface DebtsListAdvancedProps {
  debts: DebtItem[];
  onBack?: () => void;
}

// Telegram Haptic
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
};

export const DebtsListAdvanced: React.FC<DebtsListAdvancedProps> = ({ debts, onBack }) => {
  // States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'warning'>('all');

  // Unikal mahalla va kategoriyalarni ajratib olish
  const neighborhoods = useMemo(() => {
    const set = new Set(debts.map(d => d.neighborhood).filter(Boolean));
    return Array.from(set) as string[];
  }, [debts]);

  const categories = useMemo(() => {
    const set = new Set(debts.map(d => d.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [debts]);

  // Qarz muddatini hisoblash funksiyasi
  const getDebtStatus = useCallback((createdAt: string, dueInDays: number) => {
    const created = new Date(createdAt).getTime();
    const dueDate = created + dueInDays * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', days: Math.abs(diffDays), label: `${Math.abs(diffDays)} kun o'tib ketdi` };
    } else if (diffDays <= 3) {
      return { status: 'warning', days: diffDays, label: `${diffDays} kun qoldi` };
    }
    return { status: 'normal', days: diffDays, label: `${diffDays} kun bor` };
  }, []);

  // Filtrlash va Saralash Mantiqi
  const filteredAndSortedDebts = useMemo(() => {
    return debts
      .filter((item) => {
        // Search Filter
        const matchesSearch = 
          item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customerPhone.includes(searchQuery);

        // Neighborhood Filter
        const matchesNeighborhood = selectedNeighborhood === 'all' || item.neighborhood === selectedNeighborhood;

        // Category Filter
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

        // Status Filter
        const debtStatus = getDebtStatus(item.createdAt, item.dueInDays).status;
        const matchesStatus = statusFilter === 'all' || debtStatus === statusFilter;

        return matchesSearch && matchesNeighborhood && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'date') {
          comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortField === 'amount') {
          comp = a.amount - b.amount;
        } else if (sortField === 'name') {
          comp = a.customerName.localeCompare(b.customerName);
        } else if (sortField === 'dueDate') {
          const dueA = new Date(a.createdAt).getTime() + a.dueInDays * 86400000;
          const dueB = new Date(b.createdAt).getTime() + b.dueInDays * 86400000;
          comp = dueA - dueB;
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [debts, searchQuery, sortField, sortOrder, selectedNeighborhood, selectedCategory, statusFilter, getDebtStatus]);

  // KPI Hisob-kitoblari
  const stats = useMemo(() => {
    let totalAmount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    filteredAndSortedDebts.forEach((item) => {
      totalAmount += item.amount;
      const status = getDebtStatus(item.createdAt, item.dueInDays);
      if (status.status === 'overdue') {
        overdueAmount += item.amount;
        overdueCount++;
      }
    });

    return { totalAmount, overdueAmount, overdueCount, count: filteredAndSortedDebts.length };
  }, [filteredAndSortedDebts, getDebtStatus]);

  // Saralashni almashtirish
  const toggleSort = (field: SortField) => {
    triggerHaptic('light');
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Telegram Orqali Eslatma Yuborish
  const handleSendTelegramReminder = (debt: DebtItem) => {
    triggerHaptic('medium');
    const formattedMoney = new Intl.NumberFormat('uz-UZ').format(debt.amount);
    const message = `Assalomu alaykum, ${debt.customerName}.\nSizning ${formattedMoney} so'm miqdoridagi nasiya to'lov muddati yetib keldi. Iltimos, imkon qadar tezroq hisob-kitob qilishingizni so'raymiz. Rahmat!`;
    
    // Telegram Share URL
    const cleanPhone = debt.customerPhone.replace(/[^0-9]/g, '');
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(message)}`;
    window.open(tgUrl, '_blank');
  };

  // Excel (CSV) Eksport Funksiyasi
  const exportToCSV = () => {
    triggerHaptic('heavy');
    if (filteredAndSortedDebts.length === 0) return;

    const headers = ["Mijoz Ismi", "Telefon", "Summa (UZS)", "Sana", "Muddat (Kun)", "Mahalla", "Toifa"];
    const rows = filteredAndSortedDebts.map(d => [
      `"${d.customerName}"`,
      `"${d.customerPhone}"`,
      d.amount,
      `"${new Date(d.createdAt).toLocaleDateString('uz-UZ')}"`,
      d.dueInDays,
      `"${d.neighborhood || ''}"`,
      `"${d.category || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Qarzdorlar_Ruyxati_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 space-y-4 max-w-xl mx-auto font-sans">
      
      {/* Dynamic Dashboard KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Umumiy Nasiya</span>
          <div className="mt-2">
            <h2 className="text-2xl font-extrabold text-indigo-400 tracking-tight">
              {new Intl.NumberFormat('uz-UZ').format(stats.totalAmount)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats.count} ta mijoz hisobida</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Muddati O'tgan</span>
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="mt-2">
            <h2 className="text-2xl font-extrabold text-rose-500 tracking-tight">
              {new Intl.NumberFormat('uz-UZ').format(stats.overdueAmount)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{stats.overdueCount} ta xavfli nasiya</p>
          </div>
        </div>
      </div>

      {/* Live Search & Export Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism yoki tel bo'yicha qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <button
          onClick={exportToCSV}
          title="Excel ga yuklash"
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Explorer Style Sorting Toolbar */}
      <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-1 text-xs font-semibold">
        <button
          onClick={() => toggleSort('date')}
          className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            sortField === 'date' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Vaqt</span>
          {sortField === 'date' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>

        <button
          onClick={() => toggleSort('amount')}
          className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            sortField === 'amount' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Hajm</span>
          {sortField === 'amount' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>

        <button
          onClick={() => toggleSort('name')}
          className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
            sortField === 'name' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Ism</span>
          {sortField === 'name' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>
      </div>

      {/* Status Chips Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition ${
            statusFilter === 'all' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          Barchasi ({debts.length})
        </button>
        <button
          onClick={() => setStatusFilter('overdue')}
          className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition flex items-center gap-1.5 ${
            statusFilter === 'overdue' ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          Muddati o'tganlar
        </button>
      </div>

      {/* Main Debts List */}
      <div className="space-y-2.5">
        {filteredAndSortedDebts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Hech qanday qarzdorlik ma'lumoti topilmadi.
          </div>
        ) : (
          filteredAndSortedDebts.map((debt) => {
            const statusInfo = getDebtStatus(debt.createdAt, debt.dueInDays);

            return (
              <div
                key={debt.id}
                className={`p-4 rounded-2xl border transition-all ${
                  statusInfo.status === 'overdue'
                    ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60'
                    : statusInfo.status === 'warning'
                    ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left Customer Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{debt.customerName}</h3>
                      {/* Due Status Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        statusInfo.status === 'overdue'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : statusInfo.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{debt.customerPhone}</p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                      {debt.neighborhood && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {debt.neighborhood}
                        </span>
                      )}
                      {debt.category && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-indigo-400" />
                          {debt.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Price & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-black text-indigo-400 tracking-tight">
                      {new Intl.NumberFormat('uz-UZ').format(debt.amount)} <span className="text-xs font-normal text-slate-400">so'm</span>
                    </span>

                    {/* Telegram Send Button */}
                    <button
                      onClick={() => handleSendTelegramReminder(debt)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Send className="w-3 h-3" />
                      Eslatish
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default DebtsListAdvanced;