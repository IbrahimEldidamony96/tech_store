import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { updateShipmentSchema } from "@/lib/validations/order-admin";
import { canTransitionOrder } from "@/lib/order-state-machine";
import {
  applyManualShipmentUpdate,
  ShipmentTransitionError,
} from "@/lib/shipment-service";
import {
  createBostaDelivery,
  resolveBostaCityIdCached,
  resolveBostaDistrictIdCached,
  BostaApiError,
} from "@/lib/bosta";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { shipment: true, payment: true, items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.shipment) {
    return NextResponse.json(
      { error: "Shipment already exists for this order" },
      { status: 409 },
    );
  }
  // COD مالهاش شرط دفع مسبق (الفلوس بتتحصل وقت التسليم فعليًا)، أي
  // طريقة تانية لازم الدفع ينجح الأول قبل ما نجهز شحنة
  if (
    order.payment?.method !== "CASH_ON_DELIVERY" &&
    order.payment?.status !== "PAID"
  ) {
    return NextResponse.json(
      {
        error: "Payment must succeed before shipping (except Cash on Delivery)",
      },
      { status: 409 },
    );
  }
  if (!canTransitionOrder(order.status, "PROCESSING")) {
    return NextResponse.json(
      { error: `Cannot start shipment from order status ${order.status}` },
      { status: 409 },
    );
  }

  // مهم: بننادي Bosta *قبل* ما نلمس الداتابيز، مش جواها. نداء شبكة لسيرفر
  // تاني ممكن ياخد ثواني أو يفشل — لو عملناه جوه transaction هنبقى ماسكين
  // قفل/connection من غير داعي، ولو الـ transaction اترجعت (rollback) بعد
  // ما الشحنة اتعملت فعليًا عند Bosta هيبقى عندنا شحنة موجودة هناك ومش
  // موجودة عندنا. فبنعمل نداء Bosta الأول، ولو نجح نكتب النتيجة في
  // transaction سريعة محلية بس.
  let bosta: { bostaDeliveryId: string; trackingNumber: string };
  try {
    const cityId = await resolveBostaCityIdCached(
      order.shippingBostaCityId,
      order.shippingGovernorate,
    );
    // *** ملاحظة *** — order.shippingCity هنا هو اسم الـ zone (مش
    // district)، زي ما كان دايمًا. الـ fallback بالاسم في
    // resolveBostaDistrictIdCached بيدوّر على zone بالاسم ده الأول
    // وبعدين ياخد أول district جواها — شايف lib/bosta.ts. shippingArea
    // (اسم الـ district الحقيقي دلوقتي بعد الفيكس) مش مستخدم هنا لأن
    // العناوين الجديدة أصلاً هتيجي ومعاها bostaDistrictId محفوظ، فالـ
    // fallback ده بيتفعّل بس للعناوين القديمة اللي shippingArea فاضية
    // عندها أصلًا.
    const districtId = await resolveBostaDistrictIdCached(
      order.shippingBostaDistrictId,
      cityId,
      order.shippingCity,
    );

    // *** لوج مؤقت للتشخيص *** — بيوضّح بالظبط الـ id اللي اتحل واتبعت
    // لـ Bosta، مقابل الاسم النصي اللي جاي من الأوردر. لو "District Not
    // Found" رجعت تاني، الأرقام دي هتوضح فورًا إذا كانت المشكلة في
    // المطابقة بالاسم (fuzzy match) ولا في الـ id نفسه.
    console.log("[bosta] resolving delivery address", {
      governorate: order.shippingGovernorate,
      resolvedCityId: cityId,
      cachedCityId: order.shippingBostaCityId,
      zoneName: order.shippingCity,
      districtName: order.shippingArea,
      resolvedDistrictId: districtId,
      cachedDistrictId: order.shippingBostaDistrictId,
    });

    bosta = await createBostaDelivery({
      businessReference: order.id,
      cod:
        order.payment?.method === "CASH_ON_DELIVERY"
          ? order.total.toNumber()
          : 0,
      receiver: {
        firstName: order.shippingFirstName,
        lastName: order.shippingLastName,
        phone: order.shippingPhone,
      },
      address: {
        city: order.shippingGovernorate,
        cityId,
        zone: order.shippingCity,
        districtId,
        firstLine: order.shippingStreet,
        buildingNumber: order.shippingBuildingNo ?? undefined,
        apartment: order.shippingApartment ?? undefined,
      },
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      notes: `Tech Store order ${order.id}`,
    });
  } catch (err) {
    const message =
      err instanceof BostaApiError || err instanceof Error
        ? err.message
        : "Bosta request failed";
    return NextResponse.json(
      { error: `Could not create Bosta delivery: ${message}` },
      { status: 502 },
    );
  }

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        orderId: id,
        status: "PENDING",
        carrier: "Bosta",
        trackingNumber: bosta.trackingNumber,
        bostaDeliveryId: bosta.bostaDeliveryId,
      },
    });
    await tx.order.update({ where: { id }, data: { status: "PROCESSING" } });
    return created;
  });

  return NextResponse.json({ data: shipment }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { shipment: true, payment: true },
  });

  if (!order || !order.shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const { status: nextStatus, ...details } = parsed.data;

  try {
    const result = await applyManualShipmentUpdate(
      id,
      order,
      nextStatus,
      details,
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof ShipmentTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
