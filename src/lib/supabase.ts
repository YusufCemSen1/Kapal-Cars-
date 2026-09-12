import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * .env doldurulmadıysa (ya da örnek değerler duruyorsa) uygulama anlaşılmaz bir
 * ağ hatası yerine kurulum uyarısı gösterir.
 */
export const isConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL.trim()) &&
  SUPABASE_ANON_KEY.trim().length > 40;

export const supabase = createClient(
  SUPABASE_URL || "http://localhost",
  SUPABASE_ANON_KEY || "anon",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);

/** Edge Function çağrısı — hata mesajlarını Türkçe olarak yüzeye çıkarır. */
export async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let message = "Bağlantı hatası. İnternetinizi kontrol edin.";
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === "function") {
      try {
        const parsed = await res.json();
        if (parsed?.error) message = String(parsed.error);
      } catch {
        /* gövde okunamadı, varsayılan mesaj kalsın */
      }
    }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

/** RPC çağrısı; Postgres hatalarını okunur mesaja çevirir. */
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(temizleHata(error.message));
  return data as T;
}

function temizleHata(message: string) {
  if (message.includes("JWT") || message.includes("expired")) {
    return "Oturumunuzun süresi doldu. Tekrar giriş yapın.";
  }
  if (message.includes("permission denied") || message.includes("yetkiniz")) {
    return "Bu işlem için yetkiniz yok.";
  }
  return message.replace(/^.*ERROR:\s*/i, "");
}
