import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({
  children,
  isInternal,
}: {
  children: React.ReactNode;
  isInternal: boolean;
}) {
  return (
    <div className="min-h-screen">
      <AppSidebar isInternal={isInternal} />
      <div className="min-h-screen min-w-0 pl-[188px] md:pl-[200px]">
        <main>
          <div className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
