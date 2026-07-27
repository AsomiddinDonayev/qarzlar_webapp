import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  AlertTriangle, 
  CheckCircle2, 
  Delete, 
  RotateCcw, 
  ArrowLeft, 
  Wallet, 
  MapPin, 
  Tag, 
  Loader2,
  Calendar
} from 'lucide-react';

// Types[cite: 31]
export interface DebtPayload {
  amount: number;
  customerName: string;
  customerPhone: string;
  neighborhood: string;
  category: string;
  note?: string;
  dueInDays: number;
  createdAt: string;
}

export interface FastDebtEntryScreenProps {
  onSubmit?: (data: DebtPayload) => Promise<void>;
  onBack?: () => void;
  neighborhoods?: string[];
  categories?: string[];
}

const TYPO_GUARD_THRESHOLD = 2000000; // 2,000,000 UZS limit for extra confirmation[cite: 31]
const MAX_ALLOWED_AMOUNT = 1000000000; // 1,000,000,000 UZS maximum boundary[cite: 31]

// Telegram Haptic Feedback Helper[cite: 31]
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

// Phone auto-formatter for Uzbekistan (+998 XX XXX XX XX)
const formatPhoneNumber = (value: string) => {
  let numbers = value.replace(/\D/g, '');
  if (numbers.startsWith('998')) {
    numbers = numbers.slice(3);
  }
  numbers = numbers.slice(0, 9); // Max 9 digits after 998
  
  let formatted = '+998';
  if (numbers.length > 0) formatted += ' ' + numbers.substring(0, 2);
  if (numbers.length > 2) formatted += ' ' + numbers.substring(2, 5);
  if (numbers.length > 5) formatted += ' ' + numbers.substring(5, 7);
  if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 9);
  return formatted;
};

export const FastDebtEntryScreen: React.FC<FastDebtEntryScreenProps> = ({
  onSubmit,
  onBack,
  neighborhoods = ["Markaz", "Yangi Hayot", "Navro'z", "Bog'ishamol", "Do'stlik"],
  categories = ["Oziq-ovqat", "Xo'jalik mollari", "Ichimliklar", "Qurilish", "Boshqa"]
}) => {
  // Theme state[cite: 31]
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Form states[cite: 31]
  const [amountString, setAmountString] = useState<string>('0');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('+998 ');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(''); // Optional now
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
  const [dueInDays, setDueInDays] = useState<number>(30);
  const [customDateInput, setCustomDateInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  
  const DUE_DAY_OPTIONS = [
    { label: '+3 kun', days: 3 },
    { label: '+7 kun', days: 7 },
    { label: '+14 kun', days: 14 },
    { label: '+30 kun', days: 30 },
    { label: '+60 kun', days: 60 },
  ];

  // UI status states[cite: 31]
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculated numeric amount[cite: 31]
  const numericAmount = useMemo(() => {
    const parsed = parseInt(amountString, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [amountString]);

  // Formatted currency display[cite: 31]
  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat('uz-UZ').format(numericAmount) + " so'm";
  }, [numericAmount]);

  // Notification auto-dismiss[cite: 31]
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Phone input handler with auto-formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatPhoneNumber(val);
    setCustomerPhone(formatted);
  };

  // NumPad Input Handlers[cite: 31]
  const handleDigitPress = useCallback((digit: string) => {
    triggerHaptic('light');
    setAmountString((prev) => {
      if (prev === '0') return digit === '00' ? '0' : digit;
      if (prev.length >= 10) return prev;
      const newValue = prev + digit;
      if (parseInt(newValue, 10) > MAX_ALLOWED_AMOUNT) return prev;
      return newValue;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    triggerHaptic('medium');
    setAmountString((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const handleClear = useCallback(() => {
    triggerHaptic('medium');
    setAmountString('0');
  }, []);

  const handleQuickAdd = useCallback((value: number) => {
    triggerHaptic('light');
    setAmountString((prev) => {
      const current = parseInt(prev, 10) || 0;
      const updated = current + value;
      if (updated > MAX_ALLOWED_AMOUNT) return MAX_ALLOWED_AMOUNT.toString();
      return updated.toString();
    });
  }, []);

  // Handle Calendar Date Selection
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    setCustomDateInput(dateVal);
    if (dateVal) {
      const targetDate = new Date(dateVal);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setDueInDays(diffDays);
      }
    }
  };

  // Validation & Submission Logic[cite: 31]
  const executeSubmission = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setShowConfirmModal(false);

    const payload: DebtPayload = {
      amount: numericAmount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      neighborhood: selectedNeighborhood || "Ko'rsatilmagan",
      category: selectedCategory,
      note: note.trim(),
      dueInDays,
      createdAt: new Date().toISOString(),
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      }
      triggerHaptic('success');
      setNotification({ type: 'success', message: "Nasiya muvaffaqiyatli saqlandi!" });
      // Reset form[cite: 31]
      setAmountString('0');
      setCustomerName('');
      setCustomerPhone('+998 ');
      setSelectedNeighborhood('');
      setNote('');
    } catch (err: any) {
      triggerHaptic('error');
      setNotification({ 
        type: 'error', 
        message: err?.message || "Xatolik yuz berdi. Qayta urinib ko'ring." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttempt = () => {
    if (numericAmount <= 0) {
      triggerHaptic('error');
      setNotification({ type: 'error', message: "Iltimos, summani kiritishingiz shart!" });
      return;
    }

    if (!customerName.trim()) {
      triggerHaptic('error');
      setNotification({ type: 'error', message: "Mijoz ismini kiritishingiz shart!" });
      return;
    }

    // Validate Phone Format (+998 XX XXX XX XX -> exactly 9 digits after +998)
    const phoneDigits = customerPhone.replace(/\D/g, '').replace(/^998/, '');
    if (phoneDigits.length !== 9) {
      triggerHaptic('error');
      setNotification({ type: 'error', message: "Telefon raqam noto'g'ri formatda! Masalan: +998 90 123 45 67" });
      return;
    }

    // Trigger Typo Guard Modal if amount is high[cite: 31]
    if (numericAmount >= TYPO_GUARD_THRESHOLD) {
      triggerHaptic('medium');
      setShowConfirmModal(true);
    } else {
      executeSubmission();
    }
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 flex flex-col justify-between select-none ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Bar Header[cite: 31] */}
      <header className={`px-4 py-3 border-b flex items-center justify-between ${
        isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white/80'
      } backdrop-blur-md sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              aria-label="Orqaga"
              className="p-2 rounded-xl transition hover:bg-slate-500/10 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h1 className="font-semibold text-lg">Tezkor Nasiya</h1>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsDarkMode(!isDarkMode);
          }}
          className={`p-2.5 rounded-xl border transition active:scale-95 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
              : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
          }`}
          aria-label="Mavzuni o'zgartirish"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Form Content[cite: 31] */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4">

        {/* Dynamic Notification Toast[cite: 31] */}
        {notification && (
          <div className={`p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Currency Display Area[cite: 31] */}
        <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-inner ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Nasiya Summasi</span>
          <div className={`text-3xl font-extrabold tracking-tight transition-all ${
            numericAmount > 0 ? 'text-indigo-500' : 'text-slate-500'
          }`}>
            {formattedAmount}
          </div>
        </div>

        {/* Customer Name & Phone */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Mijoz ismi"
            className={`px-3.5 py-3 rounded-xl text-sm border outline-none ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600'
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
            }`}
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={handlePhoneChange}
            placeholder="+998 90 123 45 67"
            className={`px-3.5 py-3 rounded-xl text-sm border outline-none ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600'
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Due Date Term Selector & Calendar Picker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              To'lov muddati ({dueInDays} kun)
            </label>
            <div className="flex items-center gap-1 text-xs text-indigo-400">
              <Calendar className="w-3.5 h-3.5" />
              <input 
                type="date" 
                value={customDateInput}
                onChange={handleDateSelect}
                className="bg-transparent text-xs outline-none cursor-pointer text-indigo-400 font-medium"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {DUE_DAY_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => {
                  triggerHaptic('light');
                  setDueInDays(opt.days);
                  setCustomDateInput('');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition active:scale-95 border ${
                  dueInDays === opt.days && !customDateInput
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Neighborhood Selector (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 px-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Mahalla / Hudud (Ixtiyoriy)
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {neighborhoods.map((item) => (
              <button
                key={item}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedNeighborhood(prev => prev === item ? '' : item);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition active:scale-95 border ${
                  selectedNeighborhood === item
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Category Selector[cite: 31] */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 px-1">
            <Tag className="w-3.5 h-3.5 text-indigo-400" /> Mahsulot Toifasi
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(cat);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition active:scale-95 border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Addition Chips[cite: 31] */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '+10k', val: 10000 },
            { label: '+50k', val: 50000 },
            { label: '+100k', val: 100000 },
            { label: '+500k', val: 500000 },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleQuickAdd(chip.val)}
              className={`py-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                isDarkMode 
                  ? 'bg-slate-900/90 border-slate-800 text-indigo-400 hover:bg-slate-800' 
                  : 'bg-indigo-50/60 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom Numpad Grid[cite: 31] */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigitPress(digit)}
              className={`py-3.5 rounded-2xl text-xl font-bold border transition active:scale-95 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800/80 text-slate-100 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {digit}
            </button>
          ))}

          {/* Backspace Button[cite: 31] */}
          <button
            onClick={handleBackspace}
            aria-label="Bitta o'chirish"
            className={`py-3.5 rounded-2xl border flex items-center justify-center transition active:scale-95 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
            }`}
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Clear & Save Action Bar[cite: 31] */}
        <div className="flex gap-2.5 mt-2">
          <button
            onClick={handleClear}
            aria-label="Tozalash"
            className={`px-4 py-3.5 rounded-2xl border font-semibold flex items-center justify-center transition active:scale-95 ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-800'
                : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleSubmitAttempt}
            disabled={isSubmitting || numericAmount <= 0}
            className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <span>Nasiyani Saqlash</span>
            )}
          </button>
        </div>

      </main>

      {/* Typo Guard Confirmation Modal[cite: 31] */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className={`max-w-xs w-full rounded-3xl p-6 border shadow-2xl flex flex-col items-center text-center gap-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-3.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg">Katta Summa Ogohlantirishi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Siz <span className="font-semibold text-indigo-400">{formattedAmount}</span> miqdorida nasiya kiritmoqchisiz. Summa to'g'riligiga ishonchingiz komilmi?
              </p>
            </div>

            <div className="flex flex-col w-full gap-2 pt-2">
              <button
                onClick={executeSubmission}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Ha, Tasdiqlayman
              </button>
              
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowConfirmModal(false);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tahrirlashga Qaytish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FastDebtEntryScreen;