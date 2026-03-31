"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FolderKanban, Building2, Store } from "lucide-react";
import { AparentLogo } from "@/components/aparent-logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
  { href: "/crew", label: "Crew", icon: Users },
  { href: "/kunder", label: "Kunder", icon: Store },
  { href: "/byra", label: "Byrå", icon: Building2 },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[188px] shrink-0 flex-col border-r border-border bg-background py-8 pl-6 pr-4 md:w-[200px] md:pl-8">
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
    </aside>
  );
}
