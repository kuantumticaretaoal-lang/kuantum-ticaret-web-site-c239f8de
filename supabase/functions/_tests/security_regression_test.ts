// Security regression tests
// Run with: deno test --allow-net --allow-env supabase/functions/_tests/security_regression_test.ts
// Or via supabase--test_edge_functions tool

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://ldfhcfkflzgebnehbanr.supabase.co";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.test("RLS: anonymous cannot read cookie_consents", async () => {
  const { data, error } = await anon.from("cookie_consents").select("*").limit(1);
  // Either returns empty (RLS hides rows) or explicit error — never leaks data
  assert(!data || data.length === 0, "cookie_consents leaked to anon");
});

Deno.test("RLS: anonymous cannot read banner_dismissals", async () => {
  const { data } = await anon.from("banner_dismissals").select("*").limit(1);
  assert(!data || data.length === 0, "banner_dismissals leaked to anon");
});

Deno.test("RLS: anonymous cannot read live_support_messages", async () => {
  const { data } = await anon.from("live_support_messages").select("*").limit(1);
  assert(!data || data.length === 0, "live_support_messages leaked to anon");
});

Deno.test("RLS: anonymous cannot read referral_codes", async () => {
  const { data } = await anon.from("referral_codes").select("*").limit(1);
  assert(!data || data.length === 0, "referral_codes leaked to anon");
});

Deno.test("RLS: anonymous cannot insert into orders", async () => {
  const { error } = await anon.from("orders").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    delivery_type: "pickup",
    subtotal_amount: 1,
    total_amount: 1,
  });
  assert(error !== null, "anon was allowed to insert order");
});

Deno.test("Endpoint: send-order-notification-email rejects unauthenticated", async () => {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-order-notification-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "x", message: "test" }),
  });
  assertEquals(resp.status, 401);
});
