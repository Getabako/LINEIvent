import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/reservations
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");
  const countOnly = searchParams.get("count");

  // If counting active reservations for an event (public)
  if (eventId && countOnly) {
    const adminClient = createAdminClient();
    const { count } = await adminClient
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["pending", "confirmed", "checked_in"]);

    return NextResponse.json({ count: count ?? 0 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    // Admin: return all reservations with profiles and events
    let query = supabase
      .from("reservations")
      .select("*, profiles(*), events(*)")
      .order("created_at", { ascending: false });

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // User: return own reservations with event info
  const { data, error } = await supabase
    .from("reservations")
    .select("*, events(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/reservations - Create reservation (for free events)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { event_id } = await request.json();

  // Fetch event
  const adminClient = createAdminClient();
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

  // Only for free events via this endpoint
  if (event.price > 0) {
    return NextResponse.json(
      { error: "有料イベントはStripe Checkoutを使用してください" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      user_id: user.id,
      event_id,
      status: "confirmed",
      payment_status: "unpaid",
      amount: 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "既にこのイベントに予約済みです" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
