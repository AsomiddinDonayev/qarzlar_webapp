declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: { user?: { id: number; first_name: string; username?: string } };
        expand?: () => void;
        ready?: () => void;
        HapticFeedback?: {
          impactOccurred: (s: string) => void;
          notificationOccurred: (s: string) => void;
        };
      };
    };
  }
}

export interface Debt {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  note?: string | null;
  due_date: string;
  created_at?: string;
  customer_name?: string;
  phone?: string;
  status?: string;
  region?: string;
  category?: string;
}

/**
 * Validates Telegram initData via our backend (HMAC-SHA256).
 * BOT_TOKEN never touches the client — validation happens server-side.
 *
 * Returns a Supabase-compatible JWT on success, throws on failure.
 */
export async function validateInitData(initData: string): Promise<string> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (res.status === 401) throw new Error("Telegram autentifikatsiya muvaffaqiyatsiz.");
  if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);

  const { token } = await res.json();
  return token as string;
}

/** Parse Telegram WebApp initDataUnsafe safely */
export function getTelegramUser(): { id: number; first_name: string; username?: string } | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

export async function payDebt(debtId: string, extra?: any): Promise<boolean> {
  // Bu yerda qarzni to'lash amali bajariladi
  return true;
}

export async function createDebt(data: any): Promise<boolean> {
  // Bu yerda qarz yaratish amali bajariladi
  return true;
}

export const api = {
  validateInitData,
  getTelegramUser,
  getInitData,
  payDebt,
  createDebt,
};