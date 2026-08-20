"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  SquarePen,
  CalendarDays,
  CalendarClock,
  Send,
  FileText,
  Share2,
  Sparkles,
  BarChart3,
  Settings,
  Rocket,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/stores/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const navMain = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/create", label: "Create Post", icon: SquarePen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const navContent = [
  { href: "/posts/scheduled", label: "Scheduled Posts", icon: CalendarClock },
  { href: "/posts/published", label: "Published Posts", icon: Send },
  { href: "/posts/drafts", label: "Drafts", icon: FileText },
  { href: "/social-accounts", label: "Social Accounts", icon: Share2 },
  { href: "/ai-content", label: "AI Content", icon: Sparkles },
];

const navBottom = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const navDocs = [{ href: "/docs", label: "Documentation", icon: BookOpen }];

function initials(name?: string | null, email?: string) {
  const src = name || email || "U";
  return src
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavItem({
  href,
  label,
  icon: Icon,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname?.startsWith(href);
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0",
            active
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          {active && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 -z-10 rounded-lg bg-primary/10"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <Icon
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-colors",
              active && "text-primary",
            )}
          />
          {!collapsed && <span className="truncate">{label}</span>}
        </Link>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right">{label}</TooltipContent>
      )}
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-600/30">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-foreground">
              SocialPilot <span className="text-primary">AI</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              SaaS Dashboard
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
        )}
        {!collapsed && (
          <Link
            href="/create"
            className="group mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-3 text-white shadow-lg shadow-fuchsia-600/25 transition-transform hover:scale-[1.02]"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">Create new post</span>
          </Link>
        )}
        {navMain.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Content
          </p>
        )}
        {navContent.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Insights
          </p>
        )}
        {navBottom.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        {!collapsed && (
          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Resources
          </p>
        )}
        {navDocs.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="h-9 w-9 border">
            {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs text-white">
              {initials(user?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.full_name || user?.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
