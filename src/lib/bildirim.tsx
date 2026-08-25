import * as Haptics from "expo-haptics";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export type Bildirim = {
  id: string;
  type: string;
  title: string;
  body: string;
  trip_id: string | null;
  read_at: string | null;
  created_at: string;
};

type BildirimDurumu = {
  liste: Bildirim[];
  okunmamis: number;
  sonBildirim: Bildirim | null;
  bildirimiKapat: () => void;
  hepsiniOkunduYap: () => Promise<void>;
  yenile: () => Promise<void>;
  /** Yeni bildirim geldiğinde tetiklenecek dinleyici kaydeder. */
  dinle: (cb: (b: Bildirim) => void) => () => void;
};

const BildirimContext = createContext<BildirimDurumu | null>(null);

export function BildirimProvider({ children }: { children: ReactNode }) {
  const { profil } = useAuth();
  const [liste, setListe] = useState<Bildirim[]>([]);
  const [sonBildirim, setSonBildirim] = useState<Bildirim | null>(null);
  const dinleyiciler = useRef(new Set<(b: Bildirim) => void>());

  const yenile = useCallback(async () => {
    if (!profil) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,trip_id,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    setListe((data as Bildirim[]) ?? []);
  }, [profil]);

  useEffect(() => {
    if (!profil) {
      setListe([]);
      setSonBildirim(null);
      return;
    }
    yenile();

    const kanal = supabase
      .channel(`bildirim-${profil.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profil.id}`,
        },
        (payload) => {
          const yeni = payload.new as Bildirim;
          setListe((onceki) => [yeni, ...onceki].slice(0, 60));
          setSonBildirim(yeni);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          }
          dinleyiciler.current.forEach((cb) => cb(yeni));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
  }, [profil, yenile]);

  // Ekrandaki uyarı 6 saniye sonra kendiliğinden kapanır
  useEffect(() => {
    if (!sonBildirim) return;
    const t = setTimeout(() => setSonBildirim(null), 6000);
    return () => clearTimeout(t);
  }, [sonBildirim]);

  const hepsiniOkunduYap = useCallback(async () => {
    if (!profil) return;
    await supabase.rpc("bildirimleri_okundu_yap");
    setListe((onceki) =>
      onceki.map((b) => (b.read_at ? b : { ...b, read_at: new Date().toISOString() })),
    );
  }, [profil]);

  const dinle = useCallback((cb: (b: Bildirim) => void) => {
    dinleyiciler.current.add(cb);
    return () => {
      dinleyiciler.current.delete(cb);
    };
  }, []);

  const deger = useMemo<BildirimDurumu>(
    () => ({
      liste,
      okunmamis: liste.filter((b) => !b.read_at).length,
      sonBildirim,
      bildirimiKapat: () => setSonBildirim(null),
      hepsiniOkunduYap,
      yenile,
      dinle,
    }),
    [liste, sonBildirim, hepsiniOkunduYap, yenile, dinle],
  );

  return (
    <BildirimContext.Provider value={deger}>{children}</BildirimContext.Provider>
  );
}

export function useBildirim() {
  const ctx = useContext(BildirimContext);
  if (!ctx) throw new Error("useBildirim, BildirimProvider içinde kullanılmalı.");
  return ctx;
}

/**
 * Bildirim geldiğinde ekranı tazeler. Şoför ve ortacı tabloları doğrudan
 * okuyamadığı için canlı güncelleme bildirim akışı üzerinden yürür.
 */
export function useCanliYenile(yenile: () => void | Promise<void>) {
  const { dinle } = useBildirim();
  const kayit = useRef(yenile);
  kayit.current = yenile;

  useEffect(() => dinle(() => void kayit.current()), [dinle]);
}
