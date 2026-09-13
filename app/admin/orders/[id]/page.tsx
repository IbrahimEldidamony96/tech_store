import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrderActions } from "@/components/admin/order-actions";

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      shipment: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-mono text-xs text-steel">#{order.id}</p>
      <h1 className="mt-1 font-display text-xl font-bold text-ink">
        {order.user.name}
      </h1>
      <p className="text-sm text-steel">{order.user.email}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded bg-steel/10 px-2 py-1 text-xs font-medium text-ink">
          Order: {order.status}
        </span>
        <span className="rounded bg-steel/10 px-2 py-1 text-xs font-medium text-ink">
          Payment: {order.paymentStatus}
        </span>
        {order.shipment && (
          <span className="rounded bg-steel/10 px-2 py-1 text-xs font-medium text-ink">
            Shipment: {order.shipment.status}
          </span>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-steel/15 p-5">
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-steel">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-mono text-ink">
                EGP {item.totalPrice.toNumber().toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-steel/15 pt-4 text-sm font-semibold">
          <span className="text-ink">Total</span>
          <span className="font-mono text-ink">
            EGP {order.total.toNumber().toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-steel/15 p-5 text-sm text-steel">
        <p className="font-medium text-ink">Shipping to</p>
        <p className="mt-1">
          {order.shippingFirstName} {order.shippingLastName} ·{" "}
          {order.shippingPhone}
        </p>
        <p>
          {order.shippingStreet}, {order.shippingCity},{" "}
          {order.shippingGovernorate}
        </p>
      </div>

      <OrderActions
        orderId={order.id}
        orderStatus={order.status}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.payment?.method ?? null}
        shipmentStatus={order.shipment?.status ?? null}
        trackingNumber={order.shipment?.trackingNumber}
        carrier={order.shipment?.carrier}
      />
    </div>
  );
}
