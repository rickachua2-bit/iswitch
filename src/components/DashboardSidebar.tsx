import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Search, ListChecks, Wallet, User, ShieldCheck, GraduationCap,
  Settings, LogOut, Headphones,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import iswitchLogo from "@/assets/iswitch-logo.jpeg";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const PRIMARY: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, exact: true },
  { title: "Search & Book", url: "/dashboard/book", icon: Search },
  { title: "My Bookings", url: "/dashboard/bookings", icon: ListChecks },
  { title: "Wallet & Loyalty", url: "/dashboard/wallet", icon: Wallet },
];

const ACCOUNT: NavItem[] = [
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Consultations", url: "/dashboard/consultations", icon: GraduationCap },
  { title: "Become an agent", url: "/agents/apply", icon: ShieldCheck },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, hasRole } = useAuth();

  const isActive = (url: string, exact?: boolean) =>
    exact ? path === url : path === url || path.startsWith(url + "/");

  const renderItem = (item: NavItem) => {
    const active = isActive(item.url, item.exact);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={[
            "group/navitem relative h-11 rounded-xl transition-all",
            "text-primary-foreground/80 hover:!bg-primary-foreground/10 hover:!text-primary-foreground",
            active
              ? "!bg-primary-foreground/15 !text-primary-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
              : "",
          ].join(" ")}
        >
          <Link to={item.url} className="flex items-center gap-3">
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent-glow)]" />
            )}
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform",
                "group-hover/navitem:scale-110",
                active
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "bg-primary-foreground/10 text-primary-foreground",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-primary-foreground/10 [&_[data-sidebar=sidebar]]:text-primary-foreground"
      style={{
        ["--sidebar" as string]: "var(--header-bg)",
        ["--sidebar-foreground" as string]: "var(--primary-foreground)",
        ["--sidebar-accent" as string]: "color-mix(in oklab, var(--primary-foreground) 12%, transparent)",
        ["--sidebar-accent-foreground" as string]: "var(--primary-foreground)",
        ["--sidebar-border" as string]: "color-mix(in oklab, var(--primary-foreground) 12%, transparent)",
        ["--sidebar-ring" as string]: "var(--accent)",
        background: "var(--gradient-primary)",
      } as React.CSSProperties}
    >
      <SidebarHeader className="border-b border-primary-foreground/10">
        <Link to="/" className="flex items-center gap-3 px-2 py-2">
          <img
            src={iswitchLogo}
            alt="iSwitch"
            className="h-9 w-9 rounded-lg object-cover ring-2 ring-accent/60"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold tracking-tight text-primary-foreground">
                iSwitch
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                Travel hub
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-foreground/60">
            Travel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{PRIMARY.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-foreground/60">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {ACCOUNT.map(renderItem)}
              {hasRole("admin") &&
                renderItem({
                  title: "Admin",
                  url: "/admin",
                  icon: Settings,
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-primary-foreground/10 gap-1">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => window.dispatchEvent(new CustomEvent("iswitch:open-support"))}
              tooltip="Support chat"
              className="h-11 rounded-xl bg-accent text-accent-foreground shadow-md hover:!bg-accent-glow hover:!text-accent-foreground"
            >
              <Headphones className="h-4 w-4" />
              <span className="font-extrabold tracking-wide">Support 24/7</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void signOut()}
              tooltip="Sign out"
              className="h-10 rounded-xl text-primary-foreground/70 hover:!bg-primary-foreground/10 hover:!text-primary-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
