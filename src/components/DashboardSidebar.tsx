import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Search, ListChecks, Wallet, User, ShieldCheck, GraduationCap,
  Settings, LogOut, Headphones, Sparkles, Trophy, Rocket, TrendingUp,
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
  badge?: string;
  accent?: string; // tailwind gradient classes for icon chip
};

const PRIMARY: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, exact: true, accent: "from-violet-500 to-fuchsia-600" },
  { title: "Search & Book", url: "/dashboard/book", icon: Search, badge: "Hot", accent: "from-amber-500 to-orange-600" },
  { title: "My Bookings", url: "/dashboard/bookings", icon: ListChecks, accent: "from-emerald-500 to-teal-600" },
  { title: "Wallet & Loyalty", url: "/dashboard/wallet", icon: Wallet, accent: "from-sky-500 to-indigo-600" },
];

const ACCOUNT: NavItem[] = [
  { title: "Profile", url: "/dashboard/profile", icon: User, accent: "from-pink-500 to-rose-600" },
  { title: "Consultations", url: "/dashboard/consultations", icon: GraduationCap, badge: "New", accent: "from-purple-500 to-indigo-600" },
  { title: "Become an agent", url: "/agents/apply", icon: ShieldCheck, accent: "from-yellow-500 to-amber-600" },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, hasRole, user } = useAuth();

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
            "text-sidebar-foreground/80 hover:text-sidebar-foreground",
            "hover:bg-white/5",
            active
              ? "!bg-gradient-to-r !from-primary/25 !via-primary/10 !to-transparent !text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              : "",
          ].join(" ")}
        >
          <Link to={item.url} className="flex items-center gap-3">
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-glow to-primary shadow-[0_0_12px_rgba(120,120,255,0.6)]" />
            )}
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform",
                "bg-gradient-to-br shadow-md group-hover/navitem:scale-110",
                item.accent ?? "from-slate-600 to-slate-800",
                active ? "ring-2 ring-white/20" : "opacity-90",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4 text-white" />
            </span>
            <span className="font-semibold tracking-tight">{item.title}</span>
            {item.badge && !collapsed && (
              <span className="ml-auto rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow">
                {item.badge}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 [&_[data-sidebar=sidebar]]:bg-gradient-to-b [&_[data-sidebar=sidebar]]:from-[#0b1020] [&_[data-sidebar=sidebar]]:via-[#101a3a] [&_[data-sidebar=sidebar]]:to-[#0b1020] [&_[data-sidebar=sidebar]]:text-white"
    >
      <SidebarHeader className="border-b border-white/10">
        <Link to="/" className="flex items-center gap-3 px-2 py-2">
          <div className="relative">
            <img src={iswitchLogo} alt="iSwitch" className="h-9 w-9 rounded-lg object-cover ring-2 ring-primary/40" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold tracking-tight text-white">iSwitch</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-glow/80">
                Travel · Win · Repeat
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1">
        {!collapsed && (
          <div className="mx-2 mt-3 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 via-fuchsia-500/15 to-amber-400/20 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">
                Gold Member
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-bold text-white">
              {user?.email?.split("@")[0] ?? "Traveler"}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500" />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
              <span>2,450 pts</span>
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <TrendingUp className="h-3 w-3" /> +12%
              </span>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
            Travel Hub
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{PRIMARY.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
            Your Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {ACCOUNT.map(renderItem)}
              {hasRole("admin") &&
                renderItem({
                  title: "Admin",
                  url: "/admin",
                  icon: Settings,
                  accent: "from-red-500 to-rose-700",
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mx-2 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-sky-500/20 p-3">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-emerald-300" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                Unlock Platinum
              </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-white/75">
              Book 3 more trips to unlock 2x points and free upgrades.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("iswitch:open-support"))}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-900 shadow hover:bg-amber-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" /> Boost now
            </button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 gap-1">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => window.dispatchEvent(new CustomEvent("iswitch:open-support"))}
              tooltip="Support chat"
              className="h-11 rounded-xl bg-gradient-to-r from-primary via-fuchsia-500 to-pink-500 text-white shadow-lg hover:brightness-110 hover:text-white"
            >
              <Headphones className="h-4 w-4" />
              <span className="font-extrabold tracking-wide">Support 24/7</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void signOut()}
              tooltip="Sign out"
              className="h-10 rounded-xl text-white/70 hover:bg-white/5 hover:text-white"
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
