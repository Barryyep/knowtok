"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold text-label-primary">KnowTok</p>

        <nav className="flex items-center gap-1 rounded-pill border border-separator bg-surface-elevated p-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-surface-tertiary text-label-primary"
                  : "text-label-secondary hover:text-label-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          className="text-sm text-label-tertiary transition hover:text-label-primary"
          onClick={handleSignOut}
          type="button"
        >
          Sign out
        </button>
      </header>

      <main>{children}</main>
    </div>
  );
}
