import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SupportChat } from "@/components/SupportChat";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My dashboard — iSwitch" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        {/* Decorative brand background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-primary-glow/15 blur-3xl" />
        </div>

        <DashboardSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent">
          <header
            className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-primary/10 px-4 text-primary-foreground shadow-lg shadow-primary/10"
            style={{ background: "var(--gradient-hero)" }}
          >
            <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10" />
            <div className="font-display text-base font-extrabold tracking-tight">My dashboard</div>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground">
              Live
            </span>
            <div className="ml-auto hidden text-xs font-medium opacity-90 md:block">{user.email}</div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
            <Outlet />
          </main>
        </SidebarInset>

        <SupportChat />
      </div>
    </SidebarProvider>
  );
}
