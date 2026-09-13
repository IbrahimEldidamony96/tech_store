import { NextResponse } from "next/server";
import { auth } from "@/auth";

// بيترجع { error } جاهز تريّحه على طول لو مش أدمن، أو { session } لو تمام.
// بيتنادى أول سطر في أي route محتاج حماية أدمن.
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }) };
  }

  return { session, error: null };
}
