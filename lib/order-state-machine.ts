import type {
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
} from "@/app/generated/prisma/client";

// كل حالة → مسموح تتحول لإيه بس. أي انتقال مش موجود في القايمة = مرفوض.
// ده اللي بيمنع مثلاً "تسليم أوردر لسه PENDING" أو "استرجاع فلوس أوردر
// أصلاً معملوش دفع" — أخطاء منطقية، مش أخطاء تقنية، فمينفعش الداتابيز
// وحدها تمنعها (enum بيسمح بأي قيمة)، لازم قاعدة عمل صريحة زي دي.

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  // PENDING/PREPARING → RETURNED مضافة عشان Bosta ممكن تلغي الشحنة قبل
  // حتى ما تتحرك من المخزن (مثلاً العميل رفض الاستلام بدري أو في مشكلة
  // في العنوان)، مش بس بعد ما تطلع فعليًا
  PENDING: ["PREPARING", "RETURNED"],
  PREPARING: ["SHIPPED", "RETURNED"],
  SHIPPED: ["IN_TRANSIT", "RETURNED"],
  IN_TRANSIT: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
export function canTransitionShipment(
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  return SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
