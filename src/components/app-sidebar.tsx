"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  BriefcaseBusiness,
  FolderKanban,
  LogOut,
  PanelLeftClose,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { ProductWordmark } from "@/components/product-mark";
import { ServiceSwitcher } from "@/components/service-switcher";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME, WRAPUP_THEME_ACTIVE } from "@/lib/product";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "wrapup:sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "wrapup:sidebar-collapsed-change";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  };
}

function getSidebarPreferenceSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "";
  } catch {
    return "";
  }
}

function getSidebarPreferenceServerSnapshot() {
  return "";
}

const navInternal: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
  { href: "/crew", label: "Crew", icon: Users },
  { href: "/kunder", label: "Kunder", icon: Building2 },
  { href: "/byra", label: "Byrå", icon: BriefcaseBusiness },
  { href: "/brukertilgang", label: "Brukertilgang", icon: ShieldCheck },
];

const navExternal: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Prosjekter", icon: FolderKanban },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/projects");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-2 border-l-2 text-[12.5px] leading-[1.3] transition-[background,color] duration-150",
        collapsed ? "justify-center px-0" : "px-[9px]",
        active
          ? "border-l-sidebar-ring bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "border-l-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
    </Link>
  );
}

export function AppSidebar({ isInternal }: { isInternal: boolean }) {
  const nav = isInternal ? navInternal : navExternal;
  const pathname = usePathname();
  const savedCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreferenceSnapshot,
    getSidebarPreferenceServerSnapshot,
  );
  const collapsed = savedCollapsed
    ? savedCollapsed === "true"
    : pathname.startsWith("/dagsplaner/");
  const mark = WRAPUP_THEME_ACTIVE ? (
    <ServiceSwitcher />
  ) : (
    <ProductWordmark size="sm" />
  );

  function toggleCollapsed() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // Menyen kan fortsatt brukes selv om nettleserlagring er blokkert.
    }
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.assign("/login");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 self-start flex-col items-stretch border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-14" : "w-[184px]",
      )}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div
        className={cn(
          "flex min-h-[57px] shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "flex-col justify-center gap-1 py-2" : "justify-between px-3",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            className="group flex size-9 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={toggleCollapsed}
            aria-label="Utvid hovedmeny"
            aria-expanded={false}
            title="Utvid hovedmeny"
          >
            <Image
              src="/Favicon/favicon.svg"
              alt=""
              width={20}
              height={20}
              className="size-5 transition-transform duration-200 ease-out group-hover:rotate-6"
              aria-hidden="true"
            />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center overflow-hidden">
              {mark}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground transition-[background-color,color,box-shadow] duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm"
              onClick={toggleCollapsed}
              aria-label="Minimer hovedmeny"
              aria-expanded={true}
              title="Minimer hovedmeny"
            >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      <nav
        aria-label="Hovedmeny"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-px overflow-y-auto py-2.5",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        {nav.map(({ href, label, icon }) => (
          <NavRow
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(pathname, href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border py-3",
          collapsed ? "px-1.5" : "px-4",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-[12.5px] text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center px-0" : "justify-start px-0",
          )}
          onClick={() => void handleLogout()}
          aria-label={collapsed ? "Logg ut" : undefined}
          title={collapsed ? "Logg ut" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {collapsed ? null : "Logg ut"}
        </Button>
      </div>
    </aside>
  );
}

export function AppMobileNav({ isInternal }: { isInternal: boolean }) {
  const nav = isInternal ? navInternal : navExternal;
  const pathname = usePathname();
  const mark = WRAPUP_THEME_ACTIVE ? (
    <ServiceSwitcher />
  ) : (
    <ProductWordmark size="sm" />
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.assign("/login");
  }

  return (
    <header className="border-b border-border bg-card md:hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        {WRAPUP_THEME_ACTIVE ? (
          <div className="flex items-center">{mark}</div>
        ) : (
          <Link href="/" className="flex items-center" aria-label={PRODUCT_NAME}>
            {mark}
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[12.5px] text-muted-foreground"
          onClick={() => void handleLogout()}
        >
          Logg ut
        </Button>
      </div>
      <nav aria-label="Hovedmeny" className="flex gap-1 overflow-x-auto px-3 py-2">
        {nav.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-[12.5px] font-medium",
                active
                  ? "border-b-sidebar-ring text-foreground"
                  : "border-b-transparent text-muted-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
