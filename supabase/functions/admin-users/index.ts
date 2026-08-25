// Yönetici tarafından kullanıcı ekleme / güncelleme / şifre yenileme / silme.
// Şoför ve ortacılar sisteme yalnızca buradan eklenir.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cors, fail, json, randomCode, randomPassword } from "../_shared/util.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ROLES = ["admin", "sofor", "ortaci"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Yalnızca POST", 405);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return fail("Oturum bulunamadı.", 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Çağıranın gerçekten yönetici olduğunu doğrula
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData } = await anon.auth.getUser(token);
  const callerId = userData?.user?.id;
  if (!callerId) return fail("Oturum geçersiz.", 401);

  const { data: caller } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", callerId)
    .single();
  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return fail("Bu işlem için yönetici olmalısınız.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    switch (action) {
      case "create": {
        const fullName = String(body.full_name ?? "").trim();
        const role = String(body.role ?? "");
        if (fullName.length < 2) return fail("İsim en az 2 karakter olmalı.");
        if (!ROLES.includes(role)) return fail("Geçersiz rol.");

        const code = String(body.code ?? "").trim() || randomCode();
        if (code.length < 4) return fail("Şifre en az 4 karakter olmalı.");

        const email = `u-${crypto.randomUUID()}@kapalicarsi.local`;
        const password = randomPassword();

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createErr || !created.user) return fail("Kullanıcı oluşturulamadı.", 500);

        const { error: profileErr } = await admin.from("profiles").insert({
          id: created.user.id,
          full_name: fullName,
          role,
          phone: String(body.phone ?? "").trim() || null,
        });
        if (profileErr) {
          await admin.auth.admin.deleteUser(created.user.id);
          return fail("Profil kaydedilemedi: " + profileErr.message, 500);
        }

        const { error: secretErr } = await admin.rpc("upsert_user_secret", {
          p_profile: created.user.id,
          p_code: code,
          p_email: email,
          p_password: password,
        });
        if (secretErr) {
          await admin.auth.admin.deleteUser(created.user.id);
          return fail(
            secretErr.message.includes("duplicate")
              ? "Bu şifre başka bir kullanıcıda kullanılıyor. Başka bir şifre seçin."
              : "Şifre kaydedilemedi: " + secretErr.message,
            400,
          );
        }

        return json({ id: created.user.id, full_name: fullName, role, code });
      }

      case "reset_code": {
        const profileId = String(body.profile_id ?? "");
        const code = String(body.code ?? "").trim() || randomCode();
        if (!profileId) return fail("Kullanıcı belirtilmedi.");
        if (code.length < 4) return fail("Şifre en az 4 karakter olmalı.");

        const { error } = await admin.rpc("upsert_user_secret", {
          p_profile: profileId,
          p_code: code,
          p_email: null,
          p_password: null,
        });
        if (error) {
          return fail(
            error.message.includes("duplicate")
              ? "Bu şifre başka bir kullanıcıda kullanılıyor."
              : error.message,
            400,
          );
        }
        return json({ id: profileId, code });
      }

      case "update": {
        const profileId = String(body.profile_id ?? "");
        if (!profileId) return fail("Kullanıcı belirtilmedi.");
        const patch: Record<string, unknown> = {};
        if (body.full_name !== undefined) patch.full_name = String(body.full_name).trim();
        if (body.phone !== undefined) patch.phone = String(body.phone).trim() || null;
        if (body.role !== undefined) {
          if (!ROLES.includes(String(body.role))) return fail("Geçersiz rol.");
          patch.role = body.role;
        }
        if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

        const { error } = await admin.from("profiles").update(patch).eq("id", profileId);
        if (error) return fail(error.message, 400);
        return json({ ok: true });
      }

      case "delete": {
        const profileId = String(body.profile_id ?? "");
        if (!profileId) return fail("Kullanıcı belirtilmedi.");
        if (profileId === callerId) return fail("Kendinizi silemezsiniz.");
        const { error } = await admin.auth.admin.deleteUser(profileId);
        if (error) return fail(error.message, 400);
        return json({ ok: true });
      }

      default:
        return fail("Bilinmeyen işlem.");
    }
  } catch (e) {
    return fail(String((e as Error).message ?? e), 500);
  }
});
