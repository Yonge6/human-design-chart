import { createClient } from "jsr:@supabase/supabase-js@2";

export async function authenticatedClients(request: Request) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = request.headers.get("authorization") || "";
  if (!url || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  await adminClient.from("app_users").upsert({ id: data.user.id }, { onConflict: "id" });
  return { user: data.user, adminClient };
}
