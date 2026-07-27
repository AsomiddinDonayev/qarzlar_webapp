// api.ts

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
        close: () => void;
      };
    };
  }
}

const API_URL = import.meta.env.VITE_API_URL || "https://qarzlar-bot.onrender.com";

const getTelegramInitData = (): string => {
  return window.Telegram?.WebApp?.initData || "";
};

export interface Debt {
  id: string;
  customer_name: string;
  phone: string;
  amount: number;
  due_days?: number;
  region?: string;
  category?: string;
  created_at?: string;
  status: "active" | "paid" | "overdue";
}

export const api = {
  // Qarzdorlar ro'yxatini olish
  async getDebts(): Promise<Debt[]> {
    try {
      const res = await fetch(`${API_URL}/api/debts`, {
        headers: {
          "x-telegram-init-data": getTelegramInitData(),
        },
      });
      if (!res.ok) throw new Error("Serverdan ma'lumot olishda xatolik");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Get debts error:", err);
      return [];
    }
  },

  // Yangi qarz saqlash
  async createDebt(debtData: Omit<Debt, "id" | "status">): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/debts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": getTelegramInitData(),
        },
        body: JSON.stringify(debtData),
      });
      return res.ok;
    } catch (err) {
      console.error("Create debt error:", err);
      return false;
    }
  },

  // Qarzni so'ndirish (To'lov)
  async payDebt(id: string, amount: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/debts/${id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": getTelegramInitData(),
        },
        body: JSON.stringify({ amount }),
      });
      return res.ok;
    } catch (err) {
      console.error("Pay debt error:", err);
      return false;
    }
  },
};