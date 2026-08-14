"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/compose", label: "New post", icon: "✎" },
  { href: "/calendar", label: "Calendar", icon: "▤" },
  { href: "/media", label: "Media library", icon: "▣" },
  { href: "/accounts", label: "Connected accounts", icon: "⇄" },
  { href: "/billing", label: "Billing", icon: "◈" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = isAdmin ? [...NAV, { href: "/admin", label: "Clients", icon: "★" }] : NAV;
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-canvas hover:text-ink"
            )}
          >
            <span aria-hidden className="w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
        <Link href="/dashboard" className="font-[family-name:--font-display] font-semibold">
          Social Posting <span className="text-brand">Inc.</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="rounded-lg border border-line px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </header>
      {open && (
        <div className="border-b border-line bg-surface md:hidden">
          {nav}
          <div className="border-t border-line p-3">
            <button onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-canvas">
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href="/dashboard" className="font-[family-name:--font-display] font-semibold">
            Social Posting <span className="text-brand">Inc.</span>
          </Link>
        </div>
        {nav}
        <div className="border-t border-line p-3">
          <p className="truncate px-3 pb-1 text-xs text-faint">{email}</p>
          <button onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-canvas">
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
