import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const baseUrl =
    process.env.PROJECT_URL ?? process.env.NEXT_PUBLIC_PROJECT_URL ?? origin;
  const safeNext = next.startsWith("http")
    ? next
    : `${baseUrl}${next.startsWith("/") ? next : `/${next}`}`;
  return NextResponse.redirect(safeNext);
}
