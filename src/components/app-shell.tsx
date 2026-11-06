import { AppMobileNav, AppSidebar } from "@/components/app-sidebar";

export function AppShell({
  children,
  isInternal,
}: {
  children: React.ReactNode;
  isInternal: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AppSidebar isInternal={isInternal} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileNav isInternal={isInternal} />
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-4 lg:px-5">
          {children}
        </main>
      </div>
    </div>
  );
}
