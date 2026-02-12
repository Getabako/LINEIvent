import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { sendCancellationEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Fetch reservation with event and profile
  const { data: reservation } = await adminClient
    .from("reservations")
    .select("*, events(*), profiles(*)")
    .eq("id", id)
    .single();

  if (!reservation) {
    return NextResponse.json(
      { error: "予約が見つかりません" },
      { status: 404 }
    );
  }

  // Check ownership (unless admin)
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (reservation.user_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (reservation.status === "cancelled") {
    return NextResponse.json(
      { error: "既にキャンセル済みです" },
      { status: 400 }
    );
  }

  // Process Stripe refund if paid
  let refunded = false;
  if (
    reservation.payment_status === "paid" &&
    reservation.stripe_payment_intent_id
  ) {
    try {
      await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
      });
      refunded = true;
    } catch (err) {
      console.error("Stripe refund error:", err);
      return NextResponse.json(
        { error: "返金処理に失敗しました" },
        { status: 500 }
      );
    }
  }

  // Update reservation
  await adminClient
    .from("reservations")
    .update({
      status: "cancelled",
      payment_status: refunded ? "refunded" : reservation.payment_status,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Send cancellation email (non-blocking)
  try {
    if (reservation.profiles?.email) {
      sendCancellationEmail(
        reservation.profiles.email,
        reservation.profiles.display_name,
        reservation.events.title,
        reservation.events.event_date,
        refunded
      ).catch((err) => console.error("Cancel email error:", err));
    }
  } catch {
    // Don't fail the request
  }

  return NextResponse.json({ success: true, refunded });
}
