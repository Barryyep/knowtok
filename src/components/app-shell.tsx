"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const NAV_ITEMS = [
    { href: "/feed", label: t.feed },
    { href: "/saved", label: t.savedPapers },
    { href: "/profile", label: t.profile },
  ];

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

        <div className="flex items-center gap-2">
          <button
            className="rounded-pill border border-separator px-3 py-1.5 text-xs font-medium text-label-secondary transition hover:text-label-primary"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            type="button"
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
          <button
            className="text-sm text-label-tertiary transition hover:text-label-primary"
            onClick={handleSignOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
