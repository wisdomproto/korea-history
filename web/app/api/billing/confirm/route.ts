import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  TOSS_API_BASE,
  PLAN_NAME,
  PLAN_PRICE_KRW,
  PLAN_PERIOD_DAYS,
  makeOrderId,
} from "@/lib/billing";

export const runtime = "nodejs";

/**
 * 토스 빌링 successUrl 핸들러.
 * 토스가 카드 등록 성공 후 ?customerKey=...&authKey=... 로 redirect.
 *  1) authKey → 빌링키 발급
 *  2) 빌링키로 첫 결제(PLAN_PRICE_KRW)
 *  3) billing_accounts / profiles(active, premium_until +30d) / payments 저장
 *
 * 클라 전용 세션(localStorage)이라 서버에서 user 세션을 못 읽음 →
 * customerKey("gc_"+uuid무하이픈)에서 user.id 복원해 매칭.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const customerKey = sp.get("customerKey");
  const authKey = sp.get("authKey");
  const origin = req.nextUrl.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/membership?fail=1&reason=${encodeURIComponent(reason)}`);

  if (!customerKey || !authKey) return fail("missing_params");

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret || !supabaseAdmin) return fail("not_configured");

  // customerKey → user.id 복원 (gc_ + 32 hex → uuid)
  const hex = customerKey.replace(/^gc_/, "");
  if (hex.length < 32) return fail("bad_customer_key");
  const userId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;

  const auth = "Basic " + Buffer.from(secret + ":").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  try {
    // 1) 빌링키 발급
    const issueRes = await fetch(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
      method: "POST",
      headers,
      body: JSON.stringify({ authKey, customerKey }),
    });
    const issue = await issueRes.json();
    if (!issueRes.ok || !issue.billingKey) return fail(issue.message || "issue_failed");
    const billingKey: string = issue.billingKey;

    // 2) 첫 결제
    const orderId = makeOrderId(userId, Date.now());
    const payRes = await fetch(`${TOSS_API_BASE}/v1/billing/${billingKey}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerKey,
        amount: PLAN_PRICE_KRW,
        orderId,
        orderName: PLAN_NAME,
      }),
    });
    const pay = await payRes.json();
    if (!payRes.ok || pay.status !== "DONE") {
      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        order_id: orderId,
        amount: PLAN_PRICE_KRW,
        status: "FAILED",
      });
      return fail(pay.message || "payment_failed");
    }

    // 3) 저장
    const card = issue.card || {};
    const now = new Date();
    const periodEnd = new Date(now.getTime() + PLAN_PERIOD_DAYS * 86400000).toISOString();

    await supabaseAdmin.from("billing_accounts").upsert({
      user_id: userId,
      customer_key: customerKey,
      billing_key: billingKey,
      card_company: card.company ?? card.issuerCode ?? null,
      card_number: card.number ?? null,
      updated_at: now.toISOString(),
    });
    await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end: periodEnd,
        premium_until: periodEnd,
        last_payment_at: now.toISOString(),
      })
      .eq("id", userId);
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      order_id: orderId,
      amount: PLAN_PRICE_KRW,
      status: "DONE",
      payment_key: pay.paymentKey,
      approved_at: pay.approvedAt,
    });

    return NextResponse.redirect(`${origin}/membership?success=1`);
  } catch {
    return fail("unexpected");
  }
}
