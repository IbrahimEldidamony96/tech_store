import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompletePaymentButton } from "@/components/complete-payment-button";

type Params = Promise<{ id: string }>;

export default async function OrderPage({ params }: { params: Params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?next=/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });

  if (!order) notFound();
  // نفس فحص الملكية من الـ API — صاحب الأوردر أو الأدمن بس
  if (order.userId !== session.user.id && session.user.role !== "ADMIN")
    notFound();

  const needsPayment =
    order.payment &&
    order.payment.method !== "CASH_ON_DELIVERY" &&
    order.payment.status === "PENDING";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-mono text-xs uppercase tracking-wide text-signal">
        Order confirmed
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Thank you for your order
      </h1>
      <p className="mt-1 font-mono text-sm text-steel">#{order.id}</p>

      <div className="mt-8 rounded-lg border border-steel/15 p-5">
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

        <div className="mt-4 space-y-1 border-t border-steel/15 pt-4 text-sm">
          <div className="flex justify-between text-steel">
            <span>Subtotal</span>
            <span className="font-mono">
              EGP {order.subtotal.toNumber().toLocaleString()}
            </span>
          </div>
          {order.discount.toNumber() > 0 && (
            <div className="flex justify-between text-signal">
              <span>Discount</span>
              <span className="font-mono">
                −EGP {order.discount.toNumber().toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-steel">
            <span>Shipping</span>
            <span className="font-mono">
              EGP {order.shippingCost.toNumber().toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>Total</span>
            <span className="font-mono">
              EGP {order.total.toNumber().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-steel">
        Status: <span className="font-medium text-ink">{order.status}</span> ·
        Payment:{" "}
        <span className="font-medium text-ink">{order.paymentStatus}</span>
      </p>

      {needsPayment && <CompletePaymentButton orderId={order.id} />}
    </div>
  );
}
