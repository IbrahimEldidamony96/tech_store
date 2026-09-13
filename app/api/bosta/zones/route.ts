import { NextRequest, NextResponse } from "next/server";
import { getBostaZones, BostaApiError } from "@/lib/bosta";

// بيرجّع مناطق (zones) المحافظة اللي العميل اختارها — أول dropdown بعد
// المحافظة. كل منطقة هنا هتحتوي على districts كذا (dropdown تاني) —
// شايف getBostaDistrictsForZone / app/api/bosta/districts/route.ts
export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get("cityId");
  if (!cityId) {
    return NextResponse.json(
      { error: "cityId query param is required" },
      { status: 400 },
    );
  }

  try {
    const zones = await getBostaZones(cityId);
    return NextResponse.json({
      data: zones.map((z) => ({ id: z._id, name: z.name })),
    });
  } catch (err) {
    const message =
      err instanceof BostaApiError || err instanceof Error
        ? err.message
        : "Bosta request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
