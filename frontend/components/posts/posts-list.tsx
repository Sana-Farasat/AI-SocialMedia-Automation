"use client";

import * as React from "react";
import {
  CalendarClock,
  Send,
  FileText,
  AlertTriangle,
  Inbox,
  RefreshCw,
  Filter,
  Pencil,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Post } from "@/lib/types";
import { getPlatform, getStatus, platformMeta } from "@/lib/platforms";
import { cn, formatTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StatusFilter = "scheduled" | "published" | "draft" | "failed";

const filterMeta: Record<
  StatusFilter,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  scheduled: { label: "Scheduled posts", icon: CalendarClock },
  published: { label: "Published posts", icon: Send },
  draft: { label: "Drafts", icon: FileText },
  failed: { label: "Failed posts", icon: AlertTriangle },
};

export function PostsList({ filter }: { filter: StatusFilter }) {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [schedules, setSchedules] = React.useState<Record<string, string>>({});

  const meta = filterMeta[filter];

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [list, scheds] = await Promise.all([
          api.get<Post[]>("/posts", {
            status_filter: filter,
          }),
          api
            .get<{ post_id?: string; scheduled_at?: string }[]>("/posts/schedules")
            .catch(() => []),
        ]);
        setPosts(list);
        const map: Record<string, string> = {};
        for (const s of scheds) {
          if (s.post_id && s.scheduled_at) map[s.post_id] = s.scheduled_at;
        }
        setSchedules(map);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load posts";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  async function refresh() {
    setLoading(true);
    try {
      const list = await api.get<Post[]>("/posts", { status_filter: filter });
      setPosts(list);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Refresh failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            All statuses
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <meta.icon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-semibold">No {meta.label.toLowerCase()}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you create content, it will show up here.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/create")}>
              Create a post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed">
                      {post.text || "Untitled post"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {post.platforms.map((p) => {
                        const pm = getPlatform(p.platform);
                        const st = getStatus(p.status);
                        return (
                          <Badge
                            key={p.id}
                            variant="outline"
                            className="gap-1.5"
                          >
                            <pm.icon className={cn("h-3 w-3", pm.text)} />
                            {pm.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row sm:flex-col items-start gap-2 sm:items-end">
                    <Badge className={getStatus(post.status).className}>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          getStatus(post.status).dot,
                        )}
                      />
                      {post.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {schedules[post.id]
                        ? "Scheduled " + formatTime(schedules[post.id])
                        : "Created " + formatTime(post.created_at)}
                    </p>
                    {filter === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          (window.location.href = `/create?draft=${post.id}`)
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                  </div>
                </div>

                {post.status === "failed" && (
                  <div className="mt-3 space-y-1">
                    {post.platforms
                      .filter((p) => p.status === "failed" && p.error_message)
                      .map((p) => (
                        <p
                          key={p.id}
                          className="flex items-start gap-1.5 text-xs text-red-500"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {getPlatform(p.platform).label}: {p.error_message}
                          </span>
                        </p>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
