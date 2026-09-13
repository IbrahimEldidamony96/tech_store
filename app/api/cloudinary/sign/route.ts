import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import {
  createUploadSignature,
  getCloudinaryPublicConfig,
  CloudinaryError,
} from "@/lib/cloudinary";

// بيولّد توقيع للرفع المباشر من المتصفح لـ Cloudinary (من غير ما الملف
// يعدي على السيرفر بتاعنا خالص). "products" فولدر محجوز للأدمن بس —
// أي حد تاني بيرفع في "avatars" بتاعته بس.
export async function POST(request: NextRequest) {
  let body: { folder?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const folder = body.folder === "products" ? "products" : "avatars";

  const { error } =
    folder === "products" ? await requireAdmin() : await requireUser();
  if (error) return error;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createUploadSignature({ folder, timestamp });
    const { cloudName, apiKey } = getCloudinaryPublicConfig();

    return NextResponse.json({
      data: { timestamp, signature, cloudName, apiKey, folder },
    });
  } catch (err) {
    const message =
      err instanceof CloudinaryError ? err.message : "Could not prepare upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
