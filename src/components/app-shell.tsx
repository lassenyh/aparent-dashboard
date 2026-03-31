import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
