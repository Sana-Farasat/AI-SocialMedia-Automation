"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeft, LogOut, User, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthGuard } from "@/components/auth-guard";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/stores/auth";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/create": "Create Post",
  "/calendar": "Calendar",
  "/posts/scheduled": "Scheduled Posts",
  "/posts/published": "Published Posts",
  "/posts/drafts": "Drafts",
  "/social-accounts": "Social Accounts",
  "/ai-content": "AI Content",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/docs": "Documentation",
};

function ShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const title = Object.entries(titles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([p]) => pathname?.startsWith(p))?.[1] ?? "Dashboard";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <TooltipProvider>
        <Sidebar
          collapsed={collapsed}
        />
      </TooltipProvider>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden sm:inline-flex"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/create")}
              className="hidden gap-1.5 sm:inline-flex"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>New Post</span>
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border">
                    {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs text-white">
                      {(user?.full_name || user?.email || "U")
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user?.full_name || "Account"}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await handleLogout();
                      toast.success("Logged out");
                    } catch (err) {
                      const msg =
                        err instanceof ApiError ? err.message : "Logout failed";
                      toast.error(msg);
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ShellInner>{children}</ShellInner>
    </AuthGuard>
  );
}
