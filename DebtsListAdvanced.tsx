import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  DollarSign, 
  User, 
  Search, 
  Download, 
  Send, 
  AlertTriangle, 
  Clock, 
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
  createdAt: string;
  dueInDays: number;
  neighborhood?: string;
  category?: string;
}

interface DebtsListAdvancedProps {
  debts: DebtItem[];
  onBack?: () => void;
}

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
};

export const DebtsListAdvanced: React.FC<DebtsListAdvancedProps> = ({ debts }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'warning'>('all');

  // Unikal mahalla va toifalarni aniqlash
  const neighborhoods = useMemo(() => {
    const set = new Set(debts.map(d => d.neighborhood).filter(Boolean));
    return Array.from(set) as string[];
  }, [debts]);

  const categories = useMemo(() => {
    const set = new Set(debts.map(d => d.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [debts]);

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

  const filteredAndSortedDebts = useMemo(() => {
    return debts
      .filter((item) => {
        const matchesSearch = 
          item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customerPhone.includes(searchQuery);

        const matchesNeighborhood = selectedNeighborhood === 'all' || item.neighborhood === selectedNeighborhood;
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
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
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [debts, searchQuery, sortField, sortOrder, selectedNeighborhood, selectedCategory, statusFilter, getDebtStatus]);

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

  const toggleSort = (field: SortField) => {
    triggerHaptic('light');
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSendTelegramReminder = (debt: DebtItem) => {
    triggerHaptic('medium');
    const formattedMoney = new Intl.NumberFormat('uz-UZ').format(debt.amount);
    const message = `Assalomu alaykum, ${debt.customerName}.\nSizning ${formattedMoney} so'm miqdoridagi nasiya to'lov muddati yetib keldi. Iltimos, imkon qadar tezroq hisob-kitob qilishingizni so'raymiz. Rahmat!`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(message)}`;
    window.open(tgUrl, '_blank');
  };

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
    link.setAttribute("download", `Qarzdorlar_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full pb-10 space-y-3 font-sans text-slate-100">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Jami Nasiya</span>
          <div className="mt-1">
            <h2 className="text-xl font-extrabold text-indigo-400 tracking-tight">
              {new Intl.NumberFormat('uz-UZ').format(stats.totalAmount)}
            </h2>
            <p className="text-[10px] text-slate-500">{stats.count} ta mijoz</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-400 uppercase">O'tgan muddat</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="mt-1">
            <h2 className="text-xl font-extrabold text-rose-500 tracking-tight">
              {new Intl.NumberFormat('uz-UZ').format(stats.overdueAmount)}
            </h2>
            <p className="text-[10px] text-slate-500">{stats.overdueCount} ta xavfli</p>
          </div>
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Mijoz ismi yoki tel..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={exportToCSV}
          title="Excelga yuklash"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Sorting Toolbar */}
      <div className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-1 text-xs font-semibold">
        <button
          onClick={() => toggleSort('date')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            sortField === 'date' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3 h-3" />
          <span>Vaqt</span>
          {sortField === 'date' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>

        <button
          onClick={() => toggleSort('amount')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            sortField === 'amount' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Hajm</span>
          {sortField === 'amount' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>

        <button
          onClick={() => toggleSort('name')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition ${
            sortField === 'name' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3 h-3" />
          <span>Ism</span>
          {sortField === 'name' && (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
        </button>
      </div>

      {/* List Items */}
      <div className="space-y-2">
        {filteredAndSortedDebts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Qarzdorlar topilmadi.
          </div>
        ) : (
          filteredAndSortedDebts.map((debt) => {
            const statusInfo = getDebtStatus(debt.createdAt, debt.dueInDays);
            return (
              <div
                key={debt.id}
                className={`p-3 rounded-2xl border transition-all ${
                  statusInfo.status === 'overdue'
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : statusInfo.status === 'warning'
                    ? 'bg-amber-950/20 border-amber-900/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-sm">{debt.customerName}</h3>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        statusInfo.status === 'overdue'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : statusInfo.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        <Clock className="w-2.5 h-2.5" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{debt.customerPhone}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-base font-black text-indigo-400 tracking-tight">
                      {new Intl.NumberFormat('uz-UZ').format(debt.amount)} <span className="text-[10px] font-normal text-slate-400">so'm</span>
                    </span>
                    <button
                      onClick={() => handleSendTelegramReminder(debt)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[10px] font-semibold flex items-center gap-1 transition active:scale-95"
                    >
                      <Send className="w-2.5 h-2.5" />
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