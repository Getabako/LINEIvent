import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Check admin
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch reservation
  const { data: reservation } = await adminClient
    .from("reservations")
    .select("status")
    .eq("id", id)
    .single();

  if (!reservation) {
    return NextResponse.json(
      { error: "予約が見つかりません" },
      { status: 404 }
    );
  }

  if (reservation.status === "cancelled") {
    return NextResponse.json(
      { error: "キャンセル済みの予約です" },
      { status: 400 }
    );
  }

  if (reservation.status === "checked_in") {
    return NextResponse.json(
      { error: "既にチェックイン済みです" },
      { status: 400 }
    );
  }

  await adminClient
    .from("reservations")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
