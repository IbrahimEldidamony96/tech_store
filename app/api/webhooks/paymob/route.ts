import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaymobTransactionHmac } from "@/lib/paymob";
import { canTransitionOrder } from "@/lib/order-state-machine";

// Paymob بتبعت نتيجة الدفع هنا (نجاح أو فشل) — ده مصدر الحقيقة الوحيد،
// مش الـ redirect للعميل بعد الدفع (query params مش موثّقة/موقّعة).
// أي تحديث لازم يعدي من التحقق بالـ HMAC الأول.
export async function POST(request: NextRequest) {
  const receivedHmac = request.nextUrl.searchParams.get("hmac") ?? "";

  let body: { obj?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body.obj;
  if (!obj) {
    return NextResponse.json(
      { error: "Missing transaction object" },
      { status: 400 },
    );
  }

  let hmacValid: boolean;
  try {
    hmacValid = verifyPaymobTransactionHmac(obj, receivedHmac);
  } catch (err) {
    console.error("Paymob HMAC verification error", err);
    return NextResponse.json(
      { error: "HMAC verification failed" },
      { status: 500 },
    );
  }

  if (!hmacValid) {
    // مرفوضة — من غير ما نلمس أي حاجة في الداتابيز
    console.warn("Paymob webhook: invalid HMAC, rejecting");
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // special_reference اللي بعتناه وقت إنشاء الـ intention (= order id بتاعنا)
  // بيرجع هنا متداخل جوه order.merchant_order_id، مش على المستوى الأول
  const order = obj.order as Record<string, unknown> | undefined;
  const merchantOrderId = order?.merchant_order_id as string | undefined;
  const paymobTransactionId = String(obj.id);

  if (!merchantOrderId) {
    console.warn("Paymob webhook: missing merchant_order_id", obj);
    return NextResponse.json({ received: true });
  }

  const nextPaymentStatus =
    obj.success === true && obj.pending === false ? "PAID" : "FAILED";

  try {
    await prisma.$transaction(async (tx) => {
      // updateMany بشرط status: PENDING = نفس مبدأ الـ compare-and-set بتاع
      // خصم المخزون وقت الـ checkout: لو الدفع اتعالج قبل كده (إعادة
      // إرسال webhook مكرر) الشرط مش هيتحقق، count=0، ومفيش أي تأثير
      // تاني — idempotent من غير ما نحتاج جدول أحداث منفصل
      const updatedPayment = await tx.payment.updateMany({
        where: { orderId: merchantOrderId, status: "PENDING" },
        data: {
          status: nextPaymentStatus,
          transactionId: paymobTransactionId,
          ...(nextPaymentStatus === "PAID" && { paidAt: new Date() }),
        },
      });

      if (updatedPayment.count === 0 || nextPaymentStatus !== "PAID") return;

      const currentOrder = await tx.order.findUnique({
        where: { id: merchantOrderId },
        select: { status: true },
      });
      if (
        currentOrder &&
        canTransitionOrder(currentOrder.status, "CONFIRMED")
      ) {
        await tx.order.update({
          where: { id: merchantOrderId },
          data: { status: "CONFIRMED", paymentStatus: "PAID" },
        });
      }
    });
  } catch (err) {
    // مثلاً P2002 لو transactionId اتكرر بشكل غريب على أوردر تاني —
    // نرجع non-2xx عشان Paymob تعيد المحاولة بدل ما نسيب حاجة تضيع
    console.error("Paymob webhook processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}
