"use client";

import * as React from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Post } from "@/lib/types";
import { getPlatform, getStatus } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ScheduleItem {
  post_id?: string;
  scheduled_at?: string;
  [k: string]: unknown;
}
interface CalendarPost extends Post {
  scheduled_at?: string;
  status: string;
}

export function ContentCalendar() {
  const [current, setCurrent] = React.useState(new Date());
  const [view, setView] = React.useState<"month" | "list">("month");
  const [posts, setPosts] = React.useState<CalendarPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [all, schedules] = await Promise.all([
          api.get<Post[]>("/posts").catch(() => [] as Post[]),
          api.get<ScheduleItem[]>("/posts/schedules").catch(
            () => [] as ScheduleItem[],
          ),
        ]);
        const schedMap: Record<string, string> = {};
        for (const s of schedules) {
          if (s.post_id && s.scheduled_at) schedMap[s.post_id] = s.scheduled_at;
        }
        const mapped: CalendarPost[] = all.map((p) => ({
          ...p,
          scheduled_at: schedMap[p.id],
        }));
        setPosts(mapped);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Load failed";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const postsForDate = (date: Date) => {
    const target = date.toISOString().slice(0, 10);
    return posts.filter((p) => {
      const d = p.scheduled_at
        ? new Date(p.scheduled_at).toISOString().slice(0, 10)
        : new Date(p.created_at).toISOString().slice(0, 10);
      return d === target;
    });
  };

  const listPosts = [...posts]
    .filter((p) => p.scheduled_at || true)
    .sort((a, b) =>
      (a.scheduled_at || a.created_at).localeCompare(
        b.scheduled_at || b.created_at,
      ),
    );

  const counts = (date: Date) => {
    const items = postsForDate(date);
    return {
      published: items.filter((i) => i.status === "published").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      draft: items.filter((i) => i.status === "draft").length,
      failed: items.filter((i) => i.status === "failed").length,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrent(subMonths(current, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="w-40 text-center text-lg font-semibold">
            {format(current, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrent(addMonths(current, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrent(new Date())}
          >
            Today
          </Button>
        </div>
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "month" | "list")}
        >
          <TabsList>
            <TabsTrigger value="month">
              <CalendarDays className="mr-1.5 h-4 w-4" /> Month
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-1.5 h-4 w-4" /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "month" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              const inMonth = isSameMonth(date, monthStart);
              const today = isSameDay(date, new Date());
              const c = counts(date);
              const hasContent =
                c.published + c.scheduled + c.draft + c.failed > 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[92px] border-b border-r p-1.5 transition-colors",
                    !inMonth && "bg-muted/20",
                    today && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        today && "bg-primary text-primary-foreground",
                        !inMonth && "text-muted-foreground",
                      )}
                    >
                      {format(date, "d")}
                    </span>
                    {today && (
                      <span className="pr-1 text-[10px] font-semibold text-primary">
                        Today
                      </span>
                    )}
                  </div>
                  {hasContent && (
                    <div className="mt-1 space-y-1">
                      {c.scheduled > 0 && (
                        <div className="rounded bg-blue-500/90 px-1 py-0.5 text-[10px] font-medium text-white">
                          {c.scheduled} scheduled
                        </div>
                      )}
                      {c.published > 0 && (
                        <div className="rounded bg-emerald-500/90 px-1 py-0.5 text-[10px] font-medium text-white">
                          {c.published} published
                        </div>
                      )}
                      {c.draft > 0 && (
                        <div className="rounded bg-amber-500/90 px-1 py-0.5 text-[10px] font-medium text-white">
                          {c.draft} drafts
                        </div>
                      )}
                      {c.failed > 0 && (
                        <div className="rounded bg-red-500/90 px-1 py-0.5 text-[10px] font-medium text-white">
                          {c.failed} failed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading posts…
            </p>
          ) : listPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No content yet. Create a post to see it here.
            </p>
          ) : (
            listPosts.map((p) => {
              const st = getStatus(p.status);
              return (
                <Card key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <div className="rounded-lg bg-muted px-3 py-1 text-center">
                      <p className="text-xs font-semibold">
                        {format(
                          p.scheduled_at
                            ? new Date(p.scheduled_at)
                            : new Date(p.created_at),
                          "MMM d",
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(
                          p.scheduled_at
                            ? new Date(p.scheduled_at)
                            : new Date(p.created_at),
                          "HH:mm",
                        )}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.text || "Untitled post"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.platforms.map((pl) => (
                          <Badge key={pl.id} variant="outline" className="gap-1 px-1.5">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                getPlatform(pl.platform).bg,
                              )}
                            />
                            <span className="text-[10px]">
                              {getPlatform(pl.platform).label}
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("shrink-0", st.className)}>{st.label}</Badge>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
