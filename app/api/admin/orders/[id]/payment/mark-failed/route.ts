import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { canTransitionPayment } from "@/lib/order-state-machine";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, include: { payment: true, items: true } });
  if (!order || !order.payment) {
    return NextResponse.json({ error: "Order or payment not found" }, { status: 404 });
  }

  if (!canTransitionPayment(order.payment.status, "FAILED")) {
    return NextResponse.json(
      { error: `Cannot mark payment as FAILED from status ${order.payment.status}` },
      { status: 409 }
    );
  }

  // فشل الدفع = الأوردر بيتلغي، والمخزون اللي اتحجز وقت الـ checkout
  // (Phase 5) لازم يرجع تاني — نفس فكرة التحديث الذرّي، بالعكس هنا
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { orderId: id }, data: { status: "FAILED" } });
    await tx.order.update({ where: { id }, data: { paymentStatus: "FAILED", status: "CANCELLED" } });

    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  return NextResponse.json({ data: { id, status: "CANCELLED", paymentStatus: "FAILED" } });
}
