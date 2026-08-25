import { useRouter, useSegments } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { callFunction, isConfigured, rpc, supabase } from "./supabase";

export type Rol = "admin" | "sofor" | "ortaci";

export type Profil = {
  id: string;
  username: string;
  full_name: string;
  role: Rol;
  phone: string | null;
  is_active: boolean;
  is_available: boolean;
};

type AuthDurumu = {
  hazir: boolean;
  profil: Profil | null;
  girisYap: (kullaniciAdi: string, sifre: string) => Promise<Profil>;
  cikisYap: () => Promise<void>;
  profiliYenile: () => Promise<void>;
  musaitlikAyarla: (musait: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthDurumu | null>(null);

export const rolAnaSayfasi: Record<Rol, string> = {
  admin: "/(admin)",
  sofor: "/(sofor)",
  ortaci: "/(ortaci)",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hazir, setHazir] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);

  const profiliCek = useCallback(async () => {
    const satirlar = await rpc<Profil[]>("me");
    const p = Array.isArray(satirlar) ? satirlar[0] : null;
    setProfil(p && p.is_active ? p : null);
    if (p && !p.is_active) await supabase.auth.signOut();
    return p ?? null;
  }, []);

  useEffect(() => {
    let iptal = false;

    (async () => {
      if (!isConfigured) {
        setHazir(true);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) await profiliCek();
      } catch {
        await supabase.auth.signOut().catch(() => {});
      } finally {
        if (!iptal) setHazir(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setProfil(null);
    });

    return () => {
      iptal = true;
      sub.subscription.unsubscribe();
    };
  }, [profiliCek]);

  const girisYap = useCallback(
    async (kullaniciAdi: string, sifre: string) => {
      const sonuc = await callFunction<{
        session: { access_token: string; refresh_token: string };
      }>("login", { username: kullaniciAdi, code: sifre });

      const { error } = await supabase.auth.setSession({
        access_token: sonuc.session.access_token,
        refresh_token: sonuc.session.refresh_token,
      });
      if (error) throw new Error("Oturum kurulamadı: " + error.message);

      const p = await profiliCek();
      if (!p) throw new Error("Profil bulunamadı. Yönetici ile görüşün.");
      return p;
    },
    [profiliCek],
  );

  const cikisYap = useCallback(async () => {
    await supabase.auth.signOut();
    setProfil(null);
  }, []);

  const musaitlikAyarla = useCallback(async (musait: boolean) => {
    await rpc("ortaci_musaitlik", { p_available: musait });
    setProfil((onceki) =>
      onceki ? { ...onceki, is_available: musait } : onceki,
    );
  }, []);

  const deger = useMemo<AuthDurumu>(
    () => ({
      hazir,
      profil,
      girisYap,
      cikisYap,
      profiliYenile: async () => {
        await profiliCek();
      },
      musaitlikAyarla,
    }),
    [hazir, profil, girisYap, cikisYap, profiliCek, musaitlikAyarla],
  );

  return <AuthContext.Provider value={deger}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı.");
  return ctx;
}

/** Oturum durumuna göre kullanıcıyı doğru bölüme yönlendirir. */
export function useRolYonlendirme() {
  const { hazir, profil } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hazir) return;
    const kok = segments[0] as string | undefined;
    const rolGrubunda =
      kok === "(admin)" || kok === "(sofor)" || kok === "(ortaci)";

    if (!profil) {
      if (kok !== "giris") router.replace("/giris");
      return;
    }

    const beklenen = `(${profil.role})`;
    if (kok === undefined || kok === "giris" || (rolGrubunda && kok !== beklenen)) {
      router.replace(rolAnaSayfasi[profil.role] as never);
    }
  }, [hazir, profil, segments, router]);
}
