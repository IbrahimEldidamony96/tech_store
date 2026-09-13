import { NextRequest, NextResponse } from "next/server";
import { getBostaDistrictsForZone, BostaApiError } from "@/lib/bosta";

// بيرجّع districts المنطقة (zone) اللي العميل اختارها — تاني dropdown،
// بعد المحافظة والمنطقة. ده المستوى اللي فعليًا Bosta بتطلبه كـ
// districtId وقت إنشاء الشحنة (مش المنطقة نفسها — شايف lib/bosta.ts
// لتفاصيل الفرق بين الاتنين)
export async function GET(request: NextRequest) {
  const cityId = request.nextUrl.searchParams.get("cityId");
  const zoneId = request.nextUrl.searchParams.get("zoneId");
  if (!cityId || !zoneId) {
    return NextResponse.json(
      { error: "cityId and zoneId query params are required" },
      { status: 400 },
    );
  }

  try {
    const districts = await getBostaDistrictsForZone(cityId, zoneId);
    return NextResponse.json({
      data: districts.map((d) => ({ id: d.id, name: d.name })),
    });
  } catch (err) {
    const message =
      err instanceof BostaApiError || err instanceof Error
        ? err.message
        : "Bosta request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
