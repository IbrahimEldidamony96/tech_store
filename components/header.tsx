import Link from "next/link";
import { auth, signOut } from "@/auth";

// Server Component عادي — بينادي auth() مباشرة على السيرفر، من غير أي
// fetch لأي API. مفيش داعي "نتصل بنفسنا" عشان نعرف مين اليوزر.
export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-steel/15 bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-ink"
        >
          TECH<span className="text-signal">/</span>STORE
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-steel">
          <Link href="/wishlist" className="hover:text-ink">
            Wishlist
          </Link>
          <Link href="/cart" className="hover:text-ink">
            Cart
          </Link>
          {session?.user ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="hover:text-ink">
                  Admin
                </Link>
              )}
              <Link href="/orders" className="hover:text-ink">
                Orders
              </Link>
              <Link href="/account" className="hover:text-ink">
                {session.user.name}
              </Link>
              {/* Server Action مباشرة جوه الـ form — مش محتاجين نحول
                  الـ Header كله لـ Client Component عشان زرار واحد */}
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className="hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-ink px-3 py-1.5 text-paper transition-colors hover:bg-ink/90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
