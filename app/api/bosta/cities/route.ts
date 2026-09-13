import { NextResponse } from "next/server";
import { getBostaCities, BostaApiError } from "@/lib/bosta";

// Endpoint عام (من غير أدمن) — العميل نفسه بيحتاجه وقت الـ checkout عشان
// يختار محافظته من نفس القايمة اللي عند Bosta بالظبط، فمفيش تضارب
// أسماء بعدين وقت إنشاء الشحنة. بيرجّع بس id/name، مش الـ object الخام
// كامل (فيه تفاصيل داخلية زي الـ hub مش لازمة للفرونت إند).
export async function GET() {
  try {
    const cities = await getBostaCities();
    return NextResponse.json({
      data: cities.map((c) => ({ id: c._id, name: c.name })),
    });
  } catch (err) {
    const message =
      err instanceof BostaApiError || err instanceof Error
        ? err.message
        : "Bosta request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
