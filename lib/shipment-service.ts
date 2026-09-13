import { prisma } from "@/lib/prisma";
import type {
  Order,
  Payment,
  Shipment,
  ShipmentStatus,
  Prisma,
} from "@/app/generated/prisma/client";
import {
  canTransitionShipment,
  canTransitionOrder,
} from "@/lib/order-state-machine";
import { SHIPMENT_STATUS_RANK } from "@/lib/bosta";

export class ShipmentTransitionError extends Error {}

type OrderWithRelations = Order & {
  shipment: Shipment | null;
  payment: Payment | null;
};

// اللوجيك المشترك بين تحديث الأدمن اليدوي (PATCH) وتحديث الـ webhook
// التلقائي من Bosta: تحديث حالة الشحنة + تأثيراتها على الأوردر (تاريخ
// الشحن/التسليم، تحصيل الدفع لو COD). لو سيبناهم منفصلين هيبقى فيه
// تكرار وخطر إننا ننسى نعمل نفس الحاجة في الاتنين لما نعدّل واحد بعدين.
async function applyShipmentStatus(
  orderId: string,
  order: OrderWithRelations,
  nextStatus: ShipmentStatus,
  extra: Partial<
    Pick<
      Shipment,
      | "trackingNumber"
      | "carrier"
      | "shippingMethod"
      | "bostaRawState"
      | "bostaDeliveryId"
    >
  > = {},
) {
  return prisma.$transaction(async (tx) => {
    const shipmentData: Prisma.ShipmentUpdateInput = {
      status: nextStatus,
      ...extra,
    };
    if (nextStatus === "SHIPPED") shipmentData.shippedAt = new Date();
    if (nextStatus === "DELIVERED") shipmentData.deliveredAt = new Date();

    const updatedShipment = await tx.shipment.update({
      where: { orderId },
      data: shipmentData,
    });

    let updatedOrder = null;

    if (
      nextStatus === "DELIVERED" &&
      canTransitionOrder(order.status, "DELIVERED")
    ) {
      const orderData: Prisma.OrderUpdateInput = { status: "DELIVERED" };

      // COD: الفلوس بتتحصل فعليًا وقت التسليم، مش قبل كده
      if (
        order.payment?.method === "CASH_ON_DELIVERY" &&
        order.payment.status === "PENDING"
      ) {
        orderData.paymentStatus = "PAID";
        await tx.payment.update({
          where: { orderId },
          data: { status: "PAID", paidAt: new Date() },
        });
      }

      updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: orderData,
        select: { id: true, status: true, paymentStatus: true },
      });
    } else if (
      (nextStatus === "SHIPPED" || nextStatus === "IN_TRANSIT") &&
      canTransitionOrder(order.status, "SHIPPED")
    ) {
      // الأوردر مالوش حالة IN_TRANSIT مستقلة — "SHIPPED" عندنا معناها
      // "طلعت من المتجر"، أي تفاصيل تتبع أدق (في الطريق، عند العميل...)
      // موجودة على الشحنة نفسها بس
      updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "SHIPPED" },
        select: { id: true, status: true, paymentStatus: true },
      });
    }

    return { shipment: updatedShipment, order: updatedOrder };
  });
}

/** تحديث يدوي من الأدمن — لازم يمشي بالترتيب الرسمي بالظبط. */
export async function applyManualShipmentUpdate(
  orderId: string,
  order: OrderWithRelations,
  nextStatus: ShipmentStatus,
  details: {
    trackingNumber?: string;
    carrier?: string;
    shippingMethod?: string;
  },
) {
  if (!order.shipment) {
    throw new ShipmentTransitionError("Shipment not found");
  }
  if (!canTransitionShipment(order.shipment.status, nextStatus)) {
    throw new ShipmentTransitionError(
      `Cannot move shipment from ${order.shipment.status} to ${nextStatus}`,
    );
  }
  return applyShipmentStatus(orderId, order, nextStatus, details);
}

/**
 * تحديث تلقائي من Bosta webhook. الـ webhooks ممكن توصل متأخرة أو خارج
 * الترتيب (إعادة إرسال، مشكلة شبكة، إلخ)، فبدل ما نتقيد بالترتيب
 * الصارم زي تحديث الأدمن، بنسمح بأي تقدم للأمام بس (rank أعلى من
 * الحالي)، ونتجاهل أي حالة قديمة/رجوع للخلف بدون ما نرفض الـ request.
 * كده الحالة عندنا تفضل "monotonic" حتى لو webhook ضاع أو وصل متأخر.
 */
export async function applyBostaWebhookStatus(
  orderId: string,
  order: OrderWithRelations,
  nextStatus: ShipmentStatus,
  bostaRawState: string,
) {
  if (!order.shipment) return null;

  const currentRank = SHIPMENT_STATUS_RANK[order.shipment.status];
  const nextRank = SHIPMENT_STATUS_RANK[nextStatus];

  if (nextRank <= currentRank) {
    // مفيش تقدم فعلي — نسجل الحالة الخام بس للمراجعة، من غير ما "نرجّع"
    // status الرسمي للخلف
    return {
      shipment: await prisma.shipment.update({
        where: { orderId },
        data: { bostaRawState },
      }),
      order: null,
    };
  }

  return applyShipmentStatus(orderId, order, nextStatus, { bostaRawState });
}
