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
