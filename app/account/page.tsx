import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { AddressManager } from "@/components/account/address-manager";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");

  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, password: true },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto max-w-2xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        Account Settings
      </h1>

      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Profile
        </h2>
        <div className="mt-3">
          <ProfileForm initialName={user.name} initialImage={user.image} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Password
        </h2>
        <div className="mt-3">
          <PasswordForm hasPassword={!!user.password} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
          Addresses
        </h2>
        <div className="mt-3">
          <AddressManager initialAddresses={addresses} />
        </div>
      </section>
    </div>
  );
}
