import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { addressSchema } from "@/lib/validations/address";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { id } = await params;

  // *** فحص ملكية — نفس مبدأ IDOR من باقي المشروع ***
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

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
      { status: 400 },
    );
  }

  // لو العنوان ده بقى default، لازم نشيل الصفة من أي عنوان تاني — نفس
  // منطق POST بالظبط، عشان مفيش اتنين default في نفس الوقت
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: address });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { id } = await params;

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });

  // لو كان ده الـ default وفيه عناوين تانية فاضلة، حوّل الصفة لأقدم واحد
  // فيهم بدل ما اليوزر يفضل من غير عنوان افتراضي خالص
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ data: { id } });
}
