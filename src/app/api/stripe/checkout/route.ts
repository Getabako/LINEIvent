import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { event_id } = await request.json();

  const adminClient = createAdminClient();

  // Fetch event
  const { data: event } = await adminClient
    .from("events")
    .select("*")
    .eq("id", event_id)
    .single();

  if (!event) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404 }
    );
  }

  if (!event.is_published) {
    return NextResponse.json(
      { error: "このイベントは公開されていません" },
      { status: 400 }
    );
  }

  if (event.price <= 0) {
    return NextResponse.json(
      { error: "無料イベントです" },
      { status: 400 }
    );
  }

  // Check capacity
  if (event.capacity > 0) {
    const { count } = await adminClient
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event_id)
      .in("status", ["pending", "confirmed", "checked_in"]);

    if ((count ?? 0) >= event.capacity) {
      return NextResponse.json(
        { error: "定員に達しています" },
        { status: 400 }
      );
    }
  }

  // Check for existing active reservation
  const { data: existingReservation } = await adminClient
    .from("reservations")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", event_id)
    .in("status", ["pending", "confirmed", "checked_in"])
    .single();

  if (existingReservation) {
    return NextResponse.json(
      { error: "既にこのイベントに予約済みです" },
      { status: 409 }
    );
  }

  // Create pending reservation
  const { data: reservation, error: reservationError } = await adminClient
    .from("reservations")
    .insert({
      user_id: user.id,
      event_id,
      status: "pending",
      payment_status: "unpaid",
      amount: event.price,
    })
    .select()
    .single();

  if (reservationError) {
    if (reservationError.code === "23505") {
      return NextResponse.json(
        { error: "既にこのイベントに予約済みです" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: reservationError.message },
      { status: 500 }
    );
  }

  // Create Stripe Checkout Session
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: event.title,
            description: event.venue,
            ...(event.image_url ? { images: [event.image_url] } : {}),
          },
          unit_amount: event.price,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/checkout?event_id=${event_id}&status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout?event_id=${event_id}&status=cancel`,
    metadata: {
      reservation_id: reservation.id,
      event_id: event_id,
      user_id: user.id,
    },
    locale: "ja",
  });

  // Update reservation with session ID
  await adminClient
    .from("reservations")
    .update({ stripe_session_id: session.id })
    .eq("id", reservation.id);

  return NextResponse.json({ url: session.url });
}
