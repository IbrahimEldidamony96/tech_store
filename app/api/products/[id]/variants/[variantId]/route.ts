import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { variantUpdateSchema } from "@/lib/validations/variant";
import { Prisma } from "@/app/generated/prisma/client";

type Params = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { variantId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = variantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: parsed.data,
      select: { id: true, sku: true, price: true, stock: true, isActive: true },
    });
    return NextResponse.json({ data: variant });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    throw err;
  }
}
