"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  ImageIcon,
  Sparkles,
  Send,
  CalendarClock,
  Save,
  X,
  Loader2,
  Wand2,
  Type,
  AlignLeft,
  Briefcase,
  MessageSquare,
  Hash,
  Repeat,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { api, ApiError, API_URL } from "@/lib/api";
import type {
  Media,
  PlatformStatus,
  Post,
  PostPlatform,
  SocialAccount,
  GenerateResponse,
} from "@/lib/types";
import { platformMeta, getPlatform } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ComposerState {
  text: string;
  platforms: Record<string, string | null>;
  media: Media[];
  aiGenerating: boolean;
  aiLoadingPlatform: string | null;
}

const platformOrder = Object.keys(platformMeta);

const rewriteStyles = [
  { key: "professional", label: "Professional", icon: Briefcase },
  { key: "casual", label: "Casual", icon: MessageSquare },
  { key: "shorter", label: "Shorten", icon: Type },
  { key: "longer", label: "Expand", icon: AlignLeft },
];

function isPaidOrConfigIssue(msg?: string | null): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("credit") ||
    m.includes("payment") ||
    m.includes("402") ||
    m.includes("403") ||
    m.includes("forbidden") ||
    m.includes("permission") ||
    m.includes("approval") ||
    m.includes("not configured") ||
    m.includes("token") ||
    m.includes("depleted")
  );
}

export function PostComposer({ draftId }: { draftId?: string }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [platforms, setPlatforms] = React.useState<Record<string, string | null>>({});
  const [accounts, setAccounts] = React.useState<SocialAccount[]>([]);
  const [platformStatus, setPlatformStatus] = React.useState<PlatformStatus[]>([]);
  const [media, setMedia] = React.useState<Media[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [aiGenerating, setAiGenerating] = React.useState(false);
  const [aiLoadingPlatform, setAiLoadingPlatform] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [selectedPlatform, setSelectedPlatform] = React.useState("");
  const [publishErrors, setPublishErrors] = React.useState<PostPlatform[] | null>(
    null,
  );
  const [draftLoaded, setDraftLoaded] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [accts, statuses] = await Promise.all([
        api.get<SocialAccount[]>("/social-accounts").catch(() => []),
        api.get<PlatformStatus[]>("/social-accounts/platforms").catch(() => []),
      ]);
      setAccounts(accts);
      setPlatformStatus(statuses);
    })();
  }, []);

  React.useEffect(() => {
    if (!draftId) return;
    (async () => {
      try {
        const post = await api.get<Post>(`/posts/${draftId}`);
        setText(post.text || "");
        const pf: Record<string, string | null> = {};
        for (const pp of post.platforms) {
          pf[pp.platform] = pp.social_account_id || null;
        }
        setPlatforms(pf);
        setMedia(post.media || []);
        setDraftLoaded(true);
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Failed to load draft";
        toast.error(msg);
      }
    })();
  }, [draftId]);

  const connectedByPlatform = React.useMemo(() => {
    const map: Record<string, SocialAccount[]> = {};
    for (const a of accounts) {
      if (a.is_connected) {
        (map[a.platform] ??= []).push(a);
      }
    }
    return map;
  }, [accounts]);

  function togglePlatform(platform: string) {
    setPlatforms((prev) => {
      const next = { ...prev };
      if (next[platform] !== undefined) {
        delete next[platform];
      } else {
        const accts = connectedByPlatform[platform];
        next[platform] = accts&& accts[0] ? accts[0].id : null;
      }
      return next;
    });
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const m = await api.upload<Media>("/media", fd);
        setMedia((prev) => [...prev, m]);
      }
      toast.success("Media uploaded");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 422
          ? "File upload failed. Please try again or choose a different file."
          : err instanceof ApiError
            ? err.message
            : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function generateFor(platform?: string, promptOverride?: string) {
    const promptText = (promptOverride ?? aiPrompt).trim();
    if (!promptText) {
      toast.error("Describe what you want to create first.");
      return;
    }
    setAiGenerating(!platform);
    setAiLoadingPlatform(platform ?? null);
    try {
      const res = await api.post<GenerateResponse>("/ai/generate", {
        prompt: promptText,
        platform: platform || undefined,
      });
      if (platform) {
        setText((prev) => (prev ? prev + "\n\n" + res.content : res.content));
      } else {
        setText(res.content);
      }
      toast.success("AI content generated");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "AI generation failed";
      toast.error(msg);
    } finally {
      setAiGenerating(false);
      setAiLoadingPlatform(null);
    }
  }

  async function rewrite(style: string) {
    if (!text.trim()) {
      toast.error("Write some content first to rewrite.");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.post<GenerateResponse>("/ai/rewrite", {
        text,
        style,
      });
      setText(res.content);
      toast.success("Content rewritten");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Rewrite failed";
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  }

  async function addHashtags() {
    setAiGenerating(true);
    try {
      const res = await api.post<GenerateResponse>("/ai/rewrite", {
        text,
        style: "professional",
        add_hashtags: true,
      });
      setText(res.content);
      toast.success("Hashtags added");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  }

  const selectedCount = Object.keys(platforms).length;

  async function createPost(status: "draft" | "publish_now" | "scheduled") {
    const payload: Record<string, unknown> = {
      text,
      platforms: Object.entries(platforms).map(([pf, accId]) => ({
        platform: pf,
        social_account_id: accId || null,
      })),
      media_ids: media.map((m) => m.id),
      status,
    };

    setPublishErrors(null);

    try {
      const post = await api.post<Post>("/posts", payload);
      if (status === "scheduled") {
        if (!scheduledAt) {
          toast.error("Pick a schedule time.");
          setScheduleOpen(true);
          return;
        }
        await api.post(`/posts/${post.id}/schedule`, {
          scheduled_at: new Date(scheduledAt).toISOString(),
          timezone: "UTC",
        });
        toast.success("Post scheduled");
      } else if (status === "publish_now") {
        const failed = post.platforms?.filter((p) => p.status === "failed") ?? [];
        if (failed.length > 0) {
          setPublishErrors(failed);
          toast.error("Publish failed — see the reason below.");
          return;
        }
        setPublishErrors(null);
        toast.success("Post published!");
      } else {
        toast.success("Draft saved");
      }
      if (draftId) {
        api.del(`/posts/${draftId}`).catch(() => {});
      }
      router.push(
        status === "publish_now"
          ? "/posts/published"
          : status === "scheduled"
            ? "/posts/scheduled"
            : "/posts/drafts",
      );
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save post";
      toast.error(msg);
    }
  }

  async function handlePublish() {
    if (!text.trim() && media.length === 0) {
      toast.error("Add some content or media first.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Select at least one platform.");
      return;
    }
    setPublishing(true);
    try {
      await createPost("publish_now");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (selectedCount === 0) {
      toast.error("Select at least one platform.");
      return;
    }
    if (!scheduledAt) {
      toast.error("Pick a date and time.");
      return;
    }
    setSaving(true);
    try {
      await createPost("scheduled");
    } finally {
      setSaving(false);
      setScheduleOpen(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await createPost("draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {draftLoaded && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Editing a draft — make changes, then publish or schedule to use this
            content.
          </span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardContent className="p-5">
            <Label htmlFor="composer">Your content</Label>
            <Textarea
              id="composer"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your post, or ask AI to help you create one…"
              className="mt-2 min-h-[180px] resize-y text-[15px] leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {text.length} characters
              </p>
              <Badge variant="secondary" className="gap-1">
                {media.length} media
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImageIcon className="h-4 w-4" />
                Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <Video className="h-4 w-4" />
                Video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            {media.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <AnimatePresence>
                  {media.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg border"
                    >
                      {m.mime_type?.startsWith("video/") ? (
                        m.public_url ? (
                          <video
                            src={
                              m.public_url.startsWith("/")
                                ? `${API_URL}${m.public_url}`
                                : m.public_url
                            }
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Video className="h-5 w-5" />
                          </div>
                        )
                      ) : m.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            m.public_url.startsWith("/")
                              ? `${API_URL}${m.public_url}`
                              : m.public_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setMedia((prev) =>
                            prev.filter((x) => x.id !== m.id),
                          )
                        }
                        className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">AI Content Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Describe what you want and generate platform-perfect content.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") generateFor(undefined);
                }}
                placeholder='e.g. "Create a post about our new AI automation product"'
              />
              <Button
                variant="gradient"
                onClick={() => generateFor(undefined, aiPrompt)}
                disabled={aiGenerating || aiLoadingPlatform !== null}
              >
                {aiGenerating && aiLoadingPlatform === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generate
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Quick actions:
              </span>
              {rewriteStyles.map((s) => (
                <Button
                  key={s.key}
                  variant="outline"
                  size="sm"
                  disabled={aiGenerating || !text}
                  onClick={() => rewrite(s.key)}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={aiGenerating || !text}
                onClick={addHashtags}
              >
                <Hash className="h-3.5 w-3.5" /> Hashtags
              </Button>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Generate platform-specific versions
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {platformOrder.map((p) => {
                  const meta = platformMeta[p];
                  const loading = aiLoadingPlatform === p;
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={p}
                      variant="outline"
                      size="sm"
                      disabled={aiGenerating && !loading}
                      onClick={() => generateFor(p, aiPrompt)}
                      className="justify-start"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className={cn("h-3.5 w-3.5", meta.text)} />
                      )}
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold">Publish to</h3>
            <p className="text-sm text-muted-foreground">
              Select the platforms you want to reach.
            </p>

            <div className="mt-4 space-y-2">
              {platformStatus.map((ps) => {
                const meta = getPlatform(ps.platform);
                const Icon = meta.icon;
                const pc = platforms[ps.platform];
                const connected = connectedByPlatform[ps.platform];
                return (
                  <div
                    key={ps.platform}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                      pc !== undefined
                        ? "border-primary/50 bg-primary/5"
                        : "hover:bg-accent/50",
                      !ps.configurable && "opacity-50",
                    )}
                  >
                    <button
                      onClick={() => ps.configurable && togglePlatform(ps.platform)}
                      disabled={!ps.configurable}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          meta.bg,
                        )}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{meta.label}</p>
                          {pc !== undefined && (
                            <Badge className="h-4 gap-0.5 border-primary/30 bg-primary/10 px-1 text-[10px] text-primary">
                              <CheckCircle2 className="h-3 w-3" /> selected
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {!ps.configurable
                            ? "Not configured — add credentials"
                            : connected && connected.length > 0
                              ? `@${connected[0].username || connected[0].display_name || "account"}`
                              : "No account connected"}
                        </p>
                      </div>
                    </button>
                    {pc !== undefined && connected && connected.length > 1 ? (
                      <Select
                        value={pc ?? undefined}
                        onValueChange={(v) =>
                          setPlatforms((prev) => ({ ...prev, [ps.platform]: v }))
                        }
                      >
                        <SelectTrigger className="h-8 w-10 gap-0 p-0 px-2 text-xs">
                          <SelectValue placeholder="@" />
                        </SelectTrigger>
                        <SelectContent>
                          {connected.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.username || a.display_name || a.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {selectedCount > 0
                ? `${selectedCount} platform${selectedCount > 1 ? "s" : ""} selected`
                : "No platforms selected"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Button
              variant="gradient"
              className="w-full"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish now
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScheduleOpen(true)}
            >
              <CalendarClock className="h-4 w-4" />
              Schedule
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save draft
            </Button>
          </CardContent>
        </Card>

        {publishErrors && (
          <Card className="border-destructive/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold">Publish failed</h3>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This post could not be published. The real reason is below.
              </p>

              <div className="mt-3 space-y-2">
                {publishErrors.map((e) => {
                  const meta = getPlatform(e.platform);
                  return (
                    <div
                      key={e.id}
                      className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                    >
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-destructive">
                        {e.error_message || "Unknown error"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {publishErrors.some((e) =>
                isPaidOrConfigIssue(e.error_message),
              ) && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <p className="font-medium">
                    This looks like a paid API / approval / configuration issue.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    This needs a code-level fix from the developer. Contact them
                    to get it resolved.
                  </p>
                </div>
              )}

              <Button asChild variant="gradient" size="sm" className="mt-3 w-full">
                <a
                  href={`mailto:sanafarasat786@gmail.com?subject=${encodeURIComponent(
                    "SocialPilot AI — post publish failed",
                  )}&body=${encodeURIComponent(
                    "My post publish is failing:\n\nPlatform: " +
                      publishErrors.map((e) => getPlatform(e.platform).label).join(", ") +
                      "\nError:\n" +
                      publishErrors.map((e) => `- ${getPlatform(e.platform).label}: ${e.error_message || "unknown"}`).join("\n"),
                  )}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Contact developer to fix
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule post</DialogTitle>
            <DialogDescription>
              Choose when this post will be published automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="sched">Date & time</Label>
            <Input
              id="sched"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            {!scheduledAt && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <Clock className="h-4 w-4 text-warning" />
                <span>
                  The background worker will publish this automatically even
                  when you&apos;re offline.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSchedule}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}
              Confirm schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
