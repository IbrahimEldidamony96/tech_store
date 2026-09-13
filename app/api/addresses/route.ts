import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { addressSchema } from "@/lib/validations/address";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const addresses = await prisma.address.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: addresses });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // أول عنوان لليوزر بيبقى افتراضي تلقائي، وأي عنوان يتحدد صراحة
  // كـ isDefault بيشيل الصفة من أي عنوان تاني — مفيش اتنين default
  const existingCount = await prisma.address.count({ where: { userId } });
  const shouldBeDefault = parsed.data.isDefault || existingCount === 0;

  if (shouldBeDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: { ...parsed.data, userId, isDefault: shouldBeDefault },
  });

  return NextResponse.json({ data: address }, { status: 201 });
}
