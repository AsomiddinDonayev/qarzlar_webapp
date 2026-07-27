import React, { useState, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Phone, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle2,
  CalendarPlus,
  MinusCircle
} from 'lucide-react';

export interface HistoryItem {
  date: string;
  type: 'debt' | 'payment' | 'extension';
  amount: number;
  note?: string;
}

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
  history: HistoryItem[];
}

interface DebtorsScreenProps {
  debtors?: DebtRecord[];
  onCall?: (phone: string) => void;
  onUpdateDebt?: (updatedDebtor: DebtRecord) => void;
}

const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
    const haptic = (window as any).Telegram.WebApp.HapticFeedback;
    if (style === 'success') {
      haptic.notificationOccurred('success');
    } else {
      haptic.impactOccurred(style);
    }
  }
};

export const DebtorsScreen: React.FC<DebtorsScreenProps> = ({
  debtors = [],
  onCall,
  onUpdateDebt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue' | 'paid'>('all');
  const [selectedDebtor, setSelectedDebtor] = useState<DebtRecord | null>(null);
  
  // Qarzni qisqartirish / to'lov qilish uchun input state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

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

  // To'lov qilish yoki qarzni qisqartirish
  const handleMakePayment = () => {
    if (!selectedDebtor) return;
    const payVal = parseFloat(paymentAmount);
    if (isNaN(payVal) || payVal <= 0) return;

    const remaining = selectedDebtor.amount - selectedDebtor.paidAmount;
    const actualPay = payVal > remaining ? remaining : payVal;
    const newPaidAmount = selectedDebtor.paidAmount + actualPay;
    const isFullyPaid = newPaidAmount >= selectedDebtor.amount;

    const todayStr = new Date().toISOString().slice(0, 10);
    const newHistoryItem: HistoryItem = {
      date: todayStr,
      type: 'payment',
      amount: actualPay,
      note: paymentNote.trim() || `${new Intl.NumberFormat('uz-UZ').format(actualPay)} so'm to'landi`
    };

    const updated: DebtRecord = {
      ...selectedDebtor,
      paidAmount: newPaidAmount,
      status: isFullyPaid ? 'paid' : selectedDebtor.status,
      history: [newHistoryItem, ...selectedDebtor.history]
    };

    triggerHaptic('success');
    if (onUpdateDebt) onUpdateDebt(updated);
    setSelectedDebtor(updated);
    setPaymentAmount('');
    setPaymentNote('');
  };

  // Muddatni 7 kunga uzaytirish
  const handleExtendDueDate = () => {
    if (!selectedDebtor) return;
    const currentDue = new Date(selectedDebtor.dueDate);
    currentDue.setDate(currentDue.getDate() + 7);
    const newDueDateStr = currentDue.toISOString().slice(0, 10);

    const todayStr = new Date().toISOString().slice(0, 10);
    const newHistoryItem: HistoryItem = {
      date: todayStr,
      type: 'extension',
      amount: 0,
      note: `Muddat 7 kunga uzaytirildi (Yangi sana: ${newDueDateStr})`
    };

    const updated: DebtRecord = {
      ...selectedDebtor,
      dueDate: newDueDateStr,
      status: selectedDebtor.status === 'overdue' ? 'active' : selectedDebtor.status,
      history: [newHistoryItem, ...selectedDebtor.history]
    };

    triggerHaptic('success');
    if (onUpdateDebt) onUpdateDebt(updated);
    setSelectedDebtor(updated);
  };

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
                        : debtor.status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {debtor.status === 'overdue' ? "Muddati o'tgan" : debtor.status === 'paid' ? "To'langan" : 'Faol'}
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

      {/* DETALLI MODAL (Tashqariga bosganda yopiladigan qilindi: onClick on overlay) */}
      {selectedDebtor && (
        <div 
          onClick={() => setSelectedDebtor(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] flex flex-col gap-4 overflow-y-auto shadow-2xl"
          >
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">{selectedDebtor.customerName}</h3>
                <p className="text-xs text-slate-400">{selectedDebtor.customerPhone}</p>
              </div>
              <button
                onClick={() => setSelectedDebtor(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Yopish
              </button>
            </div>

            {/* Qoldiq va Umumiy summa */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Qolgan Qarz</span>
                <div className="text-base font-extrabold text-indigo-400">
                  {new Intl.NumberFormat('uz-UZ').format(selectedDebtor.amount - selectedDebtor.paidAmount)} so'm
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Muddati</span>
                <div className="text-sm font-bold text-slate-200">
                  {selectedDebtor.dueDate}
                </div>
              </div>
            </div>

            {/* Qarzni qisqartirish / to'lov qilish bloki */}
            {selectedDebtor.status !== 'paid' && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MinusCircle className="w-4 h-4 text-emerald-400" /> To'lov qilish / Qarzni kamaytirish
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Summani kiriting..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleMakePayment}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95"
                  >
                    To'lash
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExtendDueDate}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" /> Muddatni 7 kunga uzaytirish
                  </button>
                </div>
              </div>
            )}

            {/* To'liq Tarix (Qachon olgani, qachon qism to'lagani, muddat uzaytirilgani) */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operatsiyalar tarixi</h4>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {selectedDebtor.history?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'debt' 
                          ? 'bg-rose-500/10 text-rose-400' 
                          : item.type === 'payment'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.type === 'debt' ? <ArrowUpRight className="w-4 h-4" /> : item.type === 'payment' ? <ArrowDownLeft className="w-4 h-4" /> : <CalendarPlus className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-200">{item.note}</div>
                        <div className="text-[10px] text-slate-500">{item.date}</div>
                      </div>
                    </div>
                    {item.amount > 0 && (
                      <div className={`text-xs font-bold ${item.type === 'debt' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.type === 'debt' ? '+' : '-'}{new Intl.NumberFormat('uz-UZ').format(item.amount)} so'm
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onCall) onCall(selectedDebtor.customerPhone);
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-lg shadow-indigo-600/20"
            >
              <Phone className="w-4 h-4" /> Mijozga Qo'ng'iroq Qilish
            </button>

          </div>
        </div>
      )}

    </div>
  );
};