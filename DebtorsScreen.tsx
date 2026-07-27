import React, { useState, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Phone, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';

export interface DebtRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'active' | 'overdue' | 'paid';
  category: string;
  neighborhood: string;
  history: {
    date: string;
    type: 'debt' | 'payment';
    amount: number;
    note?: string;
  }[];
}

interface DebtorsScreenProps {
  debtors?: DebtRecord[];
  onCall?: (phone: string) => void;
}

const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
  }
};

export const DebtorsScreen: React.FC<DebtorsScreenProps> = ({
  debtors = [],
  onCall
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'paid'>('all');
  const [selectedDebtor, setSelectedDebtor] = useState<DebtRecord | null>(null);

  const stats = useMemo(() => {
    const totalDebt = debtors.reduce((acc, curr) => acc + (curr.amount - curr.paidAmount), 0);
    const totalOverdue = debtors
      .filter(d => d.status === 'overdue')
      .reduce((acc, curr) => acc + (curr.amount - curr.paidAmount), 0);
    return { totalDebt, totalOverdue };
  }, [debtors]);

  const filteredDebtors = useMemo(() => {
    return debtors.filter(d => {
      const matchesSearch = d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.customerPhone.includes(searchQuery);
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [debtors, searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 flex flex-col gap-4 max-w-md mx-auto select-none">
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Qarzdorlar va Statistika</h1>
          <Users className="w-5 h-5 text-indigo-400" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Umumiy Nasiya</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-lg font-extrabold text-indigo-400">
              {new Intl.NumberFormat('uz-UZ').format(stats.totalDebt)} so'm
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Muddati O'tgan</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-lg font-extrabold text-rose-400">
              {new Intl.NumberFormat('uz-UZ').format(stats.totalOverdue)} so'm
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ism yoki telefon raqam..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm outline-none placeholder:text-slate-600 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'active', label: 'Faol' },
            { id: 'overdue', label: "Muddati o'tgan" },
            { id: 'paid', label: "To'langan" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setFilterStatus(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {filteredDebtors.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Qarzdorlar topilmadi
          </div>
        ) : (
          filteredDebtors.map(debtor => {
            const remaining = debtor.amount - debtor.paidAmount;
            return (
              <div
                key={debtor.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedDebtor(debtor);
                }}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{debtor.customerName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      debtor.status === 'overdue' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {debtor.status === 'overdue' ? "Muddati o'tgan" : 'Faol'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{debtor.customerPhone}</span>
                    <span>•</span>
                    <span>{debtor.neighborhood}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-indigo-400">
                    {new Intl.NumberFormat('uz-UZ').format(remaining)} so'm
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> {debtor.dueDate}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDebtor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] flex flex-col gap-4 overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">{selectedDebtor.customerName}</h3>
                <p className="text-xs text-slate-400">{selectedDebtor.customerPhone}</p>
              </div>
              <button
                onClick={() => setSelectedDebtor(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Yopish
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Qarzlar tarixi</h4>
              <div className="space-y-2">
                {selectedDebtor.history?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'debt' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {item.type === 'debt' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{item.note || (item.type === 'debt' ? 'Nasiya olindi' : "To'lov qilindi")}</div>
                        <div className="text-[10px] text-slate-500">{item.date}</div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${item.type === 'debt' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.type === 'debt' ? '+' : '-'}{new Intl.NumberFormat('uz-UZ').format(item.amount)} so'm
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onCall) onCall(selectedDebtor.customerPhone);
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <Phone className="w-4 h-4" /> Mijozga Qo'ng'iroq Qilish
            </button>

          </div>
        </div>
      )}

    </div>
  );
};