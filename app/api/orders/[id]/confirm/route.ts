import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { checkoutSchema } from "@/lib/validations/checkout";
import { CheckoutError } from "@/lib/checkout-errors";
import { Prisma } from "@/app/generated/prisma/client";
import {
  createIntention,
  paymobCheckoutUrl,
  PaymobApiError,
} from "@/lib/paymob";

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

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { addressId, couponCode, paymentMethod } = parsed.data;

  // *** فحص ملكية العنوان — نفس مبدأ IDOR من Phase 4 ***
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // ---------- 1. لكل عنصر: قفل السعر + خصم المخزون بشكل ذرّي ----------
        // بنقرأ الـ variant من جوه الترانزاكشن (مش من بيانات الكارت
        // القديمة) عشان السعر يبقى هو الحقيقي لحظة الدفع بالظبط.
        const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
        let subtotal = new Prisma.Decimal(0);

        for (const item of cart.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: { select: { nameEn: true, isActive: true } } },
          });

          if (!variant || !variant.isActive || !variant.product.isActive) {
            throw new CheckoutError(
              "PRODUCT_UNAVAILABLE",
              "One of the products is no longer available",
            );
          }

          // *** التحديث الذرّي — العمود الفقري لمنع الـ overselling ***
          // الشرط والتحديث في statement واحد. لو اتنين طلبوا في نفس
          // اللحظة، Postgres بيسلسلهم؛ التاني بيعيد تقييم الشرط على
          // القيمة الجديدة ويفشل (count=0) لو المخزون معادش كفاية.
          const stockUpdate = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });

          if (stockUpdate.count === 0) {
            throw new CheckoutError(
              "OUT_OF_STOCK",
              `Insufficient stock for ${variant.product.nameEn} (SKU: ${variant.sku})`,
            );
          }

          const unitPrice = variant.price;
          const totalPrice = unitPrice.mul(item.quantity);
          subtotal = subtotal.add(totalPrice);

          orderItemsData.push({
            variant: { connect: { id: variant.id } },
            quantity: item.quantity,
            productName: variant.product.nameEn, // TODO: يتحدد حسب locale الطلب لما يبقى فيه فرونت إند
            sku: variant.sku,
            unitPrice,
            totalPrice,
          });
        }

        // ---------- 2. الكوبون (لو موجود) ----------
        let discount = new Prisma.Decimal(0);
        let couponId: string | null = null;

        if (couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode },
          });

          if (!coupon || !coupon.isActive) {
            throw new CheckoutError(
              "INVALID_COUPON",
              "Coupon not found or inactive",
            );
          }

          const now = new Date();
          if (coupon.startsAt && coupon.startsAt > now) {
            throw new CheckoutError(
              "INVALID_COUPON",
              "Coupon is not active yet",
            );
          }
          if (coupon.expiresAt && coupon.expiresAt < now) {
            throw new CheckoutError("INVALID_COUPON", "Coupon has expired");
          }
          if (coupon.minOrderAmount && subtotal.lt(coupon.minOrderAmount)) {
            throw new CheckoutError(
              "INVALID_COUPON",
              "Order total is below the coupon's minimum",
            );
          }

          const priorUsage = await tx.order.count({
            where: {
              userId,
              couponId: coupon.id,
              status: { not: "CANCELLED" },
            },
          });
          if (priorUsage >= coupon.usageLimitPerUser) {
            throw new CheckoutError(
              "INVALID_COUPON",
              "You've already used this coupon",
            );
          }

          // نفس نمط التحديث الذرّي بتاع المخزون، بس على usedCount —
          // نفس المشكلة بالظبط (عداد له سقف تحت ضغط تزامن)
          if (coupon.usageLimit !== null) {
            const couponUpdate = await tx.coupon.updateMany({
              where: { id: coupon.id, usedCount: { lt: coupon.usageLimit } },
              data: { usedCount: { increment: 1 } },
            });
            if (couponUpdate.count === 0) {
              throw new CheckoutError(
                "INVALID_COUPON",
                "Coupon usage limit reached",
              );
            }
          } else {
            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }

          discount =
            coupon.type === "PERCENTAGE"
              ? subtotal.mul(coupon.value).div(100)
              : coupon.value;
          if (coupon.maxDiscount && discount.gt(coupon.maxDiscount))
            discount = coupon.maxDiscount;
          if (discount.gt(subtotal)) discount = subtotal; // الإجمالي مايبقاش سالب أبدًا

          couponId = coupon.id;
        }

        // ---------- 3. الشحن + الإجمالي ----------
        // منطق مبسط دلوقتي (شحن مجاني فوق 1000) — قابل يتوسع لاحقًا
        // حسب الوزن/المنطقة من غير ما يأثر على باقي منطق الـ checkout
        const shippingCost = subtotal.gte(1000)
          ? new Prisma.Decimal(0)
          : new Prisma.Decimal(50);
        const total = subtotal.sub(discount).add(shippingCost);

        // ---------- 4. إنشاء الأوردر + العناصر + الدفع سوا ----------
        const createdOrder = await tx.order.create({
          data: {
            userId,
            status: "PENDING",
            paymentStatus: "PENDING",
            subtotal,
            shippingCost,
            discount,
            total,
            couponId,
            shippingFirstName: address.firstName,
            shippingLastName: address.lastName,
            shippingPhone: address.phone,
            shippingCountry: address.country,
            shippingGovernorate: address.governorate,
            shippingCity: address.city,
            shippingArea: address.area,
            shippingStreet: address.street,
            shippingBuildingNo: address.buildingNo,
            shippingApartment: address.apartment,
            shippingPostalCode: address.postalCode,
            items: { create: orderItemsData },
            payment: {
              create: {
                method: paymentMethod,
                status: "PENDING",
                amount: total,
              },
            },
          },
          select: {
            id: true,
            total: true,
            subtotal: true,
            discount: true,
            status: true,
            createdAt: true,
          },
        });

        // ---------- 5. تفريغ الكارت ----------
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return createdOrder;
      },
      { timeout: 10000 }, // كارت فيه عناصر كتير = loop طويل، بنوسع الوقت الافتراضي (5 ثواني)
    );

    // COD مالهاش دفع إلكتروني — الأوردر بس كفاية. الكارت/المحفظة محتاجين
    // نبدأ عملية دفع حقيقية عند Paymob. ده *برّه* الـ transaction اللي
    // فوق عمدًا (نفس مبدأ Bosta بالظبط): نداء شبكة خارجي بطيء/ممكن يفشل
    // مالوش داعي يمسك قفل/connection على الداتابيز، والـ transaction
    // أصلاً خلصت (commit) قبل ما نوصل هنا، فمفيش خطر إننا نرجعها.
    let checkoutUrl: string | null = null;
    let paymentError: string | undefined;

    if (paymentMethod !== "CASH_ON_DELIVERY") {
      const integrationId =
        paymentMethod === "CARD"
          ? process.env.PAYMOB_INTEGRATION_ID_CARD
          : process.env.PAYMOB_INTEGRATION_ID_WALLET;

      if (!integrationId) {
        paymentError = `Payment method ${paymentMethod} is not configured yet`;
      } else {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });
          const origin = request.nextUrl.origin;

          const { clientSecret } = await createIntention({
            amountCents: Math.round(order.total.toNumber() * 100),
            specialReference: order.id,
            integrationId: Number(integrationId),
            billing: {
              firstName: address.firstName,
              lastName: address.lastName,
              email: user?.email ?? "customer@techstore.com",
              phone: address.phone,
              street: address.street,
              building: address.buildingNo ?? undefined,
              apartment: address.apartment ?? undefined,
              city: address.city,
            },
            notes: `Tech Store order ${order.id}`,
            notificationUrl: `${origin}/api/webhooks/paymob`,
            redirectionUrl: `${origin}/orders/${order.id}`,
          });

          checkoutUrl = paymobCheckoutUrl(clientSecret);
        } catch (err) {
          // الأوردر اتعمل فعلاً (PENDING) حتى لو فشل بدء الدفع — العميل
          // يقدر يعيد المحاولة بعدين من صفحة الأوردر (زرار Complete Payment)
          paymentError =
            err instanceof PaymobApiError || err instanceof Error
              ? err.message
              : "Could not start payment";
        }
      }
    }

    return NextResponse.json(
      { data: order, checkoutUrl, paymentError },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    throw err;
  }
}
