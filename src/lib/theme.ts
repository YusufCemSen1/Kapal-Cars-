export const renk = {
  arka: "#F1F5F9",
  kart: "#FFFFFF",
  lacivert: "#0F172A",
  lacivert2: "#1E293B",
  metin: "#0F172A",
  soluk: "#64748B",
  cizgi: "#E2E8F0",
  mavi: "#1D4ED8",
  maviAcik: "#DBEAFE",
  yesil: "#15803D",
  yesilAcik: "#DCFCE7",
  kirmizi: "#B91C1C",
  kirmiziAcik: "#FEE2E2",
  turuncu: "#B45309",
  turuncuAcik: "#FEF3C7",
  mor: "#6D28D9",
  morAcik: "#EDE9FE",
} as const;

export const bosluk = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const yuvarlak = { sm: 8, md: 12, lg: 16, xl: 22 } as const;

export const golge = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

export type DurumAnahtari =
  | "bekliyor"
  | "atandi"
  | "alindi"
  | "tamamlandi"
  | "iptal";

export const durumEtiketi: Record<DurumAnahtari, string> = {
  bekliyor: "Bekliyor",
  atandi: "Üstlenildi",
  alindi: "Müşteri alındı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

export const durumRengi: Record<DurumAnahtari, { bg: string; fg: string }> = {
  bekliyor: { bg: renk.turuncuAcik, fg: renk.turuncu },
  atandi: { bg: renk.maviAcik, fg: renk.mavi },
  alindi: { bg: renk.morAcik, fg: renk.mor },
  tamamlandi: { bg: renk.yesilAcik, fg: renk.yesil },
  iptal: { bg: renk.kirmiziAcik, fg: renk.kirmizi },
};
