"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FolderKanban, Building2, Store, LogOut } from "lucide-react";
import { AparentLogo } from "@/components/aparent-logo";
import { Button } from "@/components/ui/button";
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-[188px] flex-col overflow-y-auto border-r border-white/10 py-8 pl-6 pr-4 md:w-[200px] md:pl-8",
        "bg-gradient-to-b from-[#1a2a4a] via-[#152238] to-[#0c1424]",
        "text-zinc-100",
      )}
    >
      <div className="mb-8">
        <Link
          href="/"
          className="block max-w-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#152238] rounded-sm"
          aria-label="Aparent"
        >
          <div className="w-[min(100%,22ch)] max-w-full [&_img]:brightness-0 [&_img]:invert [&_img]:opacity-95">
            <AparentLogo />
          </div>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
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
                "flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors",
                active
                  ? "bg-white/12 font-medium text-white"
                  : "text-zinc-300 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0 opacity-90" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[13px] text-zinc-300 hover:bg-white/8 hover:text-white"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-[15px] w-[15px] shrink-0 opacity-90" strokeWidth={1.75} />
          Logg ut
        </Button>
      </div>
    </aside>
  );
}
