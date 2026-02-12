import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/events - List events
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const upcoming = searchParams.get("upcoming");

  let query = supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (published === "true") {
    query = query.eq("is_published", true);
  }

  if (upcoming === "true") {
    query = query.gte("event_date", new Date().toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/events - Create event (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, image_url, event_date, venue, price, capacity, is_published } = body;

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || "",
      image_url: image_url || null,
      event_date,
      venue: venue || "",
      price: price || 0,
      capacity: capacity || 0,
      is_published: is_published || false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
