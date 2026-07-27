import React, { useState } from 'react';
import { Store, Edit3, Camera, CheckCircle2, Save } from 'lucide-react';

export interface ShopProfileData {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  category: string;
  description: string;
}

interface ShopProfileScreenProps {
  initialData?: ShopProfileData;
  onSave?: (data: ShopProfileData) => Promise<void>;
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

export const ShopProfileScreen: React.FC<ShopProfileScreenProps> = ({
  initialData = {
    shopName: '"Baraka" Oziq-ovqat',
    ownerName: 'Asomiddin',
    phone: '+998 90 123 45 67',
    address: 'Markaz',
    category: 'Supermarket / Do\'kon',
    description: 'Kundalik oziq-ovqat va xo\'jalik mollari savdosi.'
  },
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ShopProfileData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleInputChange = (field: keyof ShopProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSubmit = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
      triggerHaptic('success');
      setIsEditing(false);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err) {
      triggerHaptic('medium');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 flex flex-col gap-4 max-w-md mx-auto select-none">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h1 className="text-lg font-bold">Do'kon Profili</h1>
        {!isEditing ? (
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsEditing(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Edit3 className="w-4 h-4" /> Tahrirlash
          </button>
        ) : (
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsEditing(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold transition"
          >
            Bekor qilish
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Profil ma'lumotlari muvaffaqiyatli yangilandi!
        </div>
      )}

      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center text-center gap-3">
        <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 relative shadow-inner">
          <Store className="w-10 h-10" />
          {isEditing && (
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-indigo-600 text-white shadow">
              <Camera className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="font-extrabold text-lg">{formData.shopName}</h2>
          <p className="text-xs text-slate-400">{formData.category}</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Do'kon Nomi</label>
          <input
            type="text"
            disabled={!isEditing}
            value={formData.shopName}
            onChange={(e) => handleInputChange('shopName', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
              isEditing ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' : 'bg-slate-900/50 border-transparent text-slate-300'
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Sotuvchi Ismi</label>
          <input
            type="text"
            disabled={!isEditing}
            value={formData.ownerName}
            onChange={(e) => handleInputChange('ownerName', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
              isEditing ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' : 'bg-slate-900/50 border-transparent text-slate-300'
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Telefon Raqam</label>
          <input
            type="tel"
            disabled={!isEditing}
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
              isEditing ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' : 'bg-slate-900/50 border-transparent text-slate-300'
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Manzil / Hudud</label>
          <input
            type="text"
            disabled={!isEditing}
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
              isEditing ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' : 'bg-slate-900/50 border-transparent text-slate-300'
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Tavsif</label>
          <textarea
            disabled={!isEditing}
            rows={2}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition resize-none ${
              isEditing ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500' : 'bg-slate-900/50 border-transparent text-slate-300'
            }`}
          />
        </div>
      </div>

      {isEditing && (
        <button
          onClick={handleSaveSubmit}
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          <Save className="w-4 h-4" />
          <span>O'zgarishlarni Saqlash</span>
        </button>
      )}

    </div>
  );
};