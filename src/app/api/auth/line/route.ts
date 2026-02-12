import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/line - LINE IDトークン検証 → Supabase Auth ユーザー作成/セッション発行
export async function POST(request: NextRequest) {
  const { idToken, displayName, pictureUrl, email } = await request.json();

  if (!idToken) {
    return NextResponse.json(
      { error: "ID token is required" },
      { status: 400 }
    );
  }

  // Verify LINE ID token
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID!,
    }),
  });

  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "Invalid ID token" },
      { status: 401 }
    );
  }

  const lineProfile = await verifyRes.json();
  const lineUserId = lineProfile.sub;

  if (!lineUserId) {
    return NextResponse.json(
      { error: "Failed to get LINE user ID" },
      { status: 401 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // Check if user already exists by line_user_id
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.id;

    // Update profile info
    await supabaseAdmin
      .from("profiles")
      .update({
        display_name: displayName || lineProfile.name || "",
        picture_url: pictureUrl || lineProfile.picture || null,
        email: email || lineProfile.email || null,
      })
      .eq("id", userId);
  } else {
    // Create new Supabase Auth user
    const userEmail =
      email || lineProfile.email || `${lineUserId}@line.local`;

    const { data: authUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          line_user_id: lineUserId,
          display_name: displayName || lineProfile.name || "",
        },
      });

    if (createError || !authUser.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    userId = authUser.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      line_user_id: lineUserId,
      display_name: displayName || lineProfile.name || "",
      picture_url: pictureUrl || lineProfile.picture || null,
      email: email || lineProfile.email || null,
      role: "user",
    });
  }

  // Generate a session for this user
  // We use admin.generateLink for magic link then manually create session
  // Alternative: use signInWithPassword with a known password
  // Best approach: use admin API to create a session token directly

  const { data: sessionData, error: sessionError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email:
        email ||
        lineProfile.email ||
        `${lineUserId}@line.local`,
    });

  if (sessionError || !sessionData) {
    return NextResponse.json(
      { error: "Failed to generate session" },
      { status: 500 }
    );
  }

  // Extract token hash from the link
  const url = new URL(sessionData.properties.action_link);
  const tokenHash = url.searchParams.get("token");
  const type = url.searchParams.get("type");

  return NextResponse.json({
    userId,
    tokenHash,
    type,
    lineUserId,
  });
}
