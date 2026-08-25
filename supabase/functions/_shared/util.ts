export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Kolay okunur, karıştırılabilir karakter içermeyen kişisel şifre üretir. */
export function randomCode(len = 8) {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY3456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function randomPassword(len = 40) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...bytes)).slice(0, len);
}
