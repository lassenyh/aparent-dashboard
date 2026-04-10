"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FolderKanban, Building2, Store, LogOut } from "lucide-react";
import { AparentLogo } from "@/components/aparent-logo";
import { cn } from "@/lib/utils";

const navInternal = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
  { href: "/crew", label: "Crew", icon: Users },
  { href: "/kunder", label: "Kunder", icon: Store },
  { href: "/byra", label: "Byrå", icon: Building2 },
];

const navExternal = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
];

export function AppSidebar({ isInternal }: { isInternal: boolean }) {
  const nav = isInternal ? navInternal : navExternal;
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.assign("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[200px] flex-col overflow-y-auto border-r border-white/[0.06] bg-sidebar-bg">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-white/[0.06] px-5">
        <Link
          href="/"
          className="block outline-none transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-amber-500/50 rounded-sm"
          aria-label="Aparent"
        >
          <div className="w-[min(100%,18ch)] [&_img]:brightness-0 [&_img]:invert [&_img]:opacity-90">
            <AparentLogo />
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Meny
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/projects")
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-amber-400" />
              )}
              <Icon
                className={cn(
                  "h-[15px] w-[15px] shrink-0 transition-colors",
                  active ? "text-amber-400" : "text-zinc-600 group-hover:text-zinc-300",
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
          Logg ut
        </button>
      </div>
    </aside>
  );
}
