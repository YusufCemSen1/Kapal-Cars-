const paraBicimi = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function para(deger: number | string | null | undefined) {
  const n = Number(deger ?? 0);
  return `${paraBicimi.format(Number.isFinite(n) ? n : 0)} ₺`;
}

export function sayi(deger: number | string | null | undefined) {
  return paraBicimi.format(Number(deger ?? 0));
}

export function saat(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tarihSaat(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} ${saat(iso)}`;
}

/** "3 dk önce" gibi göreli zaman. */
export function gecenSure(iso: string | null | undefined) {
  if (!iso) return "";
  const fark = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (fark < 60) return "az önce";
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`;
  return `${Math.floor(fark / 86400)} gün önce`;
}

/** Kullanıcının girdiği tutarı sayıya çevirir: "12.500,50" ya da "12500.50". */
export function tutarCozumle(girdi: string): number | null {
  const temiz = girdi.replace(/[^\d.,]/g, "").trim();
  if (!temiz) return null;
  const sonVirgul = temiz.lastIndexOf(",");
  const sonNokta = temiz.lastIndexOf(".");
  let normal: string;
  if (sonVirgul > sonNokta) {
    normal = temiz.replace(/\./g, "").replace(",", ".");
  } else if (sonNokta > sonVirgul) {
    normal = temiz.replace(/,/g, "");
  } else {
    normal = temiz.replace(/[.,]/g, "");
  }
  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function gunBasi(gunOnce = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - gunOnce);
  return d.toISOString();
}

export function yarin() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}
