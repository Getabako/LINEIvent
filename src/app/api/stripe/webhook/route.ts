import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReservationConfirmationEmail } from "@/lib/email";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const reservationId = session.metadata?.reservation_id;

      if (reservationId) {
        const supabaseAdmin = createAdminClient();

        // Update reservation to confirmed + paid
        await supabaseAdmin
          .from("reservations")
          .update({
            status: "confirmed",
            payment_status: "paid",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
          })
          .eq("id", reservationId);

        // Send confirmation email (non-blocking)
        try {
          const { data: reservation } = await supabaseAdmin
            .from("reservations")
            .select("*, profiles(*), events(*)")
            .eq("id", reservationId)
            .single();

          if (reservation?.profiles?.email) {
            // Use waitUntil if available (Vercel), otherwise fire-and-forget
            sendReservationConfirmationEmail(
              reservation.profiles.email,
              reservation.profiles.display_name,
              reservation.events.title,
              reservation.events.event_date,
              reservation.events.venue,
              reservation.amount
            ).catch((err) =>
              console.error("Email send error:", err)
            );
          }
        } catch (emailErr) {
          console.error("Email error:", emailErr);
          // Don't fail the webhook
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
