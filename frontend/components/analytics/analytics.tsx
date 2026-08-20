"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  BarChart3,
  Share2,
  CalendarClock,
  Send,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Overview, AnalyticsRecord } from "@/lib/types";
import { getPlatform, platformMeta } from "@/lib/platforms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Analytics() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [records, setRecords] = React.useState<AnalyticsRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, rec] = await Promise.all([
          api.get<Overview>("/analytics/overview"),
          api
            .get<AnalyticsRecord[]>("/analytics")
            .catch(() => [] as AnalyticsRecord[]),
        ]);
        setOverview(ov);
        setRecords(rec);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Load failed";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = React.useMemo(() => {
    const byPlatform: Record<
      string,
      { platform: string; likes: number; comments: number; shares: number }
    > = {};
    for (const r of records) {
      const entry = (byPlatform[r.platform] ??= {
        platform: r.platform,
        likes: 0,
        comments: 0,
        shares: 0,
      });
      if (r.metric_name === "likes") entry.likes += r.metric_value ?? 0;
      if (r.metric_name === "comments") entry.comments += r.metric_value ?? 0;
      if (r.metric_name === "shares") entry.shares += r.metric_value ?? 0;
    }
    return Object.values(byPlatform);
  }, [records]);

  const hasData = records.length > 0;

  const statCards = [
    {
      label: "Connected accounts",
      value: overview?.connected_accounts ?? 0,
      icon: Share2,
      accent: "bg-violet-500/15 text-violet-500",
    },
    {
      label: "Published",
      value: overview?.published_posts ?? 0,
      icon: Send,
      accent: "bg-emerald-500/15 text-emerald-500",
    },
    {
      label: "Scheduled",
      value: overview?.scheduled_posts ?? 0,
      icon: CalendarClock,
      accent: "bg-blue-500/15 text-blue-500",
    },
    {
      label: "Total metrics",
      value: records.length,
      icon: TrendingUp,
      accent: "bg-amber-500/15 text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : statCards.map((s, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-3xl font-bold">{s.value}</p>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      s.accent,
                    )}
                  >
                    <s.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement by platform</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggregated metrics collected from platform APIs
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : !hasData ? (
            <EmptyAnalytics />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="platform"
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v) => getPlatform(v).label.split(" ")[0]}
                  />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="likes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" fill="var(--accent-foreground)" radius={[4, 4, 0, 0]} opacity={0.6} />
                  <Bar dataKey="shares" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metric breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {records.slice(0, 12).map((r) => {
                const pf = getPlatform(r.platform);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <pf.icon className={cn("h-4 w-4", pf.text)} />
                      <span className="text-sm capitalize">{r.metric_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.metric_value ?? 0}</span>
                      {r.period && (
                        <Badge variant="secondary" className="text-[10px]">
                          {r.period}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold">No analytics yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Once posts are published and platform APIs provide engagement data, your
        metrics will appear here.
      </p>
    </div>
  );
}
