import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAllOrders } from "@/lib/queries/admin-orders";
import type { OrderStatus } from "@/app/generated/prisma/client";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

type SearchParams = Promise<{ status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { status } = await searchParams;
  const orders = await getAllOrders(status as OrderStatus | undefined);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Orders</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-md border px-3 py-1 text-xs font-medium ${
            !status
              ? "border-ink bg-ink text-paper"
              : "border-steel/25 text-steel"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-md border px-3 py-1 text-xs font-medium ${
              status === s
                ? "border-ink bg-ink text-paper"
                : "border-steel/25 text-steel"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-steel/15">
        <table className="w-full text-sm">
          <thead className="bg-steel/5 text-left text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel/10">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-steel/5">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="block font-mono text-xs text-ink hover:underline"
                  >
                    #{order.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-steel">
                  <Link href={`/admin/orders/${order.id}`} className="block">
                    {order.user.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="block">
                    <span className="rounded bg-steel/10 px-2 py-0.5 text-xs font-medium text-ink">
                      {order.status}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-steel">
                  <Link href={`/admin/orders/${order.id}`} className="block">
                    {order.paymentStatus}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-ink">
                  <Link href={`/admin/orders/${order.id}`} className="block">
                    EGP {order.total.toNumber().toLocaleString()}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-6 text-center text-sm text-steel">No orders found.</p>
        )}
      </div>
    </div>
  );
}
