"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, FolderKanban, Building2, Store, LogOut } from "lucide-react";
import { AparentLogo } from "@/components/aparent-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
  { href: "/crew", label: "Crew", icon: Users },
  { href: "/kunder", label: "Kunder", icon: Store },
  { href: "/byra", label: "Byrå", icon: Building2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen w-[188px] shrink-0 flex-col border-r border-border bg-background py-8 pl-6 pr-4 md:w-[200px] md:pl-8">
      <div className="mb-8">
        <Link
          href="/"
          className="block max-w-full outline-none transition-opacity hover:opacity-80"
          aria-label="Aparent Production Dashboard"
        >
          <div className="grid w-[min(100%,22ch)] max-w-full grid-cols-1 gap-[10px]">
            <AparentLogo />
            <p className="text-[12px] font-medium leading-snug tracking-tight text-muted-foreground">
              Production Dashboard
            </p>
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
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0 opacity-80" strokeWidth={1.75} />
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
          className="w-full justify-start gap-2 text-[13px] text-muted-foreground"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-[15px] w-[15px] shrink-0 opacity-80" strokeWidth={1.75} />
          Logg ut
        </Button>
      </div>
    </aside>
  );
}
