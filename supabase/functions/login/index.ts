// Kişisel şifre ile giriş.
// Kullanıcı yalnızca şifresini yazar; e-posta/kullanıcı adı yoktur.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, fail, json } from "../_shared/util.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Yalnızca POST", 405);

  let code = "";
  try {
    code = String((await req.json())?.code ?? "").trim();
  } catch {
    return fail("Geçersiz istek");
  }
  if (code.length < 4) return fail("Şifre en az 4 karakter olmalı.");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin.rpc("login_lookup", { p_code: code });
  if (error) return fail("Giriş doğrulanamadı.", 500);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    // Kaba kuvvet denemelerini yavaşlat
    await new Promise((r) => setTimeout(r, 600));
    return fail("Şifre hatalı.", 401);
  }
  if (!row.is_active) return fail("Hesabınız kapatılmış. Yönetici ile görüşün.", 403);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    email: row.auth_email,
    password: row.auth_password,
  });
  if (signInError || !session.session) return fail("Oturum açılamadı.", 500);

  return json({
    session: session.session,
    profile: {
      id: row.profile_id,
      full_name: row.full_name,
      role: row.role,
    },
  });
});
