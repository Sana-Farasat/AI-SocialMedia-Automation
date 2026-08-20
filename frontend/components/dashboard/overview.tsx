"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Share2,
  CalendarClock,
  Send,
  FileText,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/stores/auth";
import { api } from "@/lib/api";
import type { Overview, SocialAccount } from "@/lib/types";
import {
  getPlatform,
  getStatus,
  platformMeta,
} from "@/lib/platforms";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              accent,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatsGrid({ overview }: { overview: Overview }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Connected accounts"
        value={overview.connected_accounts}
        icon={Share2}
        accent="bg-violet-500/15 text-violet-500"
        delay={0.05}
      />
      <StatCard
        label="Scheduled"
        value={overview.scheduled_posts}
        icon={CalendarClock}
        accent="bg-blue-500/15 text-blue-500"
        delay={0.1}
      />
      <StatCard
        label="Published"
        value={overview.published_posts}
        icon={Send}
        accent="bg-emerald-500/15 text-emerald-500"
        delay={0.15}
      />
      <StatCard
        label="Drafts"
        value={overview.drafts}
        icon={FileText}
        accent="bg-amber-500/15 text-amber-500"
        delay={0.2}
      />
      <StatCard
        label="Failed"
        value={overview.failed_posts}
        icon={AlertTriangle}
        accent="bg-red-500/15 text-red-500"
        delay={0.25}
      />
    </div>
  );
}

export function DashboardOverview() {
  const router = useRouter();
  const { user } = useAuth();
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [accounts, setAccounts] = React.useState<SocialAccount[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, acc] = await Promise.all([
          api.get<Overview>("/analytics/overview"),
          api.get<SocialAccount[]>("/social-accounts").catch(() => [] as SocialAccount[]),
        ]);
        setOverview(ov);
        setAccounts(acc);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const firstName = (user?.full_name || user?.email || "there").split(" ")[0];
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span>
            {greeting}, <span className="text-primary">{firstName}</span>
          </span>
        }
        description="Here's what's happening across your social presence today."
        actions={
          <Button onClick={() => router.push("/create")}>
            <Sparkles className="h-4 w-4" /> Create post
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : (
        overview && (
          <>
            <StatsGrid overview={overview} />

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Recent activity</h3>
                      <p className="text-sm text-muted-foreground">
                        Your latest posts across platforms
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/posts/published")}
                    >
                      View all <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {overview.recent_activity.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Create your first post to get started."
                      action={
                        <Button onClick={() => router.push("/create")}>
                          Create a post
                        </Button>
                      }
                    />
                  ) : (
                    <div className="divide-y">
                      {overview.recent_activity.map((a) => {
                        const st = getStatus(a.status);
                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full",
                                  st.dot,
                                )}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {a.text || "Untitled post"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {timeAgo(a.created_at)}
                              </p>
                            </div>
                            <Badge className={st.className}>{st.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold">Connected platforms</h3>
                  <p className="text-sm text-muted-foreground">
                    Live accounts you manage
                  </p>
                  <div className="mt-4 space-y-3">
                    {accounts.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No accounts connected yet.
                      </p>
                    ) : (
                      accounts.map((acc) => {
                        const meta = getPlatform(acc.platform);
                        const Icon = meta.icon;
                        return (
                          <div
                            key={acc.id}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-lg bg-muted",
                                meta.text,
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {acc.display_name || acc.username || meta.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {meta.label} · @{acc.username || "—"}
                              </p>
                            </div>
                            <Avatar className="h-8 w-8 border">
                              {acc.avatar_url && (
                                <AvatarImage src={acc.avatar_url} />
                              )}
                              <AvatarFallback className="text-xs">
                                {acc.platform[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <TrendingUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
