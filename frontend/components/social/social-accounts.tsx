"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  Circle,
  Loader2,
  Info,
} from "lucide-react";
import { api, ApiError, API_URL } from "@/lib/api";
import type { PlatformStatus, SocialAccount } from "@/lib/types";
import { platformMeta, platformKeysMeta } from "@/lib/platforms";
import { cn, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function SocialAccounts() {
  const [statuses, setStatuses] = React.useState<PlatformStatus[]>([]);
  const [accounts, setAccounts] = React.useState<SocialAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] =
    React.useState<SocialAccount | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [st, ac] = await Promise.all([
        api.get<PlatformStatus[]>("/social-accounts/platforms"),
        api.get<SocialAccount[]>("/social-accounts"),
      ]);
      setStatuses(st);
      setAccounts(ac);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Load failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function handleConnect(platform: string) {
    setConnecting(platform);
    try {
      const redirect_uri = `${window.location.origin}/social-accounts/callback`;
      const res = await api.post<{ auth_url: string; state: string }>(
        `/social-accounts/connect?platform=${platform}&redirect_uri=${encodeURIComponent(redirect_uri)}`,
        {},
      );
      sessionStorage.setItem("sp_oauth_platform", platform);
      sessionStorage.setItem("sp_oauth_state", res.state);
      window.location.href = res.auth_url;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Unable to connect";
      toast.error(msg);
      setConnecting(null);
    }
  }

  async function handleDisconnect(account: SocialAccount) {
    try {
      await api.post(`/social-accounts/${account.id}/disconnect`, {});
      toast.success(
        `${platformMeta[account.platform]?.label ?? account.platform} disconnected`,
      );
      setDisconnectTarget(null);
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    }
  }

  const byPlatform = (p: string) => accounts.filter((a) => a.platform === p);
  const statusByPlatform = (p: string) =>
    statuses.find((s) => s.platform === p);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Accounts"
        description="Connect and manage the platforms you publish to. Tokens are stored securely and never exposed."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-44 animate-pulse rounded-xl bg-muted/50 p-5" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platformKeysMeta.map((meta, i) => {
            const Icon = meta.icon;
            const status = statusByPlatform(meta.key);
            const connected = byPlatform(meta.key).filter((a) => a.is_connected);
            const hasAccounts = connected.length > 0;
            const configurable = status?.configurable ?? false;

            return (
              <motion.div
                key={meta.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card
                  className={cn(
                    "h-full transition-all",
                    hasAccounts && "border-primary/40",
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          meta.bg,
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {hasAccounts ? (
                        <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                      ) : configurable ? (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Circle className="h-3 w-3" /> Not connected
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                        >
                          <Info className="h-3 w-3" /> Not configured
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-3 font-semibold">{meta.label}</h3>

                    <div className="mt-3 space-y-2">
                      {hasAccounts ? (
                        connected.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2.5 rounded-lg border p-2"
                          >
                            <Avatar className="h-8 w-8 border">
                              {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                              <AvatarFallback className="text-xs">
                                {a.platform[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {a.display_name || "Account"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{a.username || "—"}
                                {a.last_synced_at
                                  ? ` · ${timeAgo(a.last_synced_at)}`
                                  : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Disconnect"
                              onClick={() => setDisconnectTarget(a)}
                            >
                              <Unlink className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {configurable
                            ? "Connect your account to start publishing."
                            : "Add OAuth credentials in the backend to enable this platform."}
                        </p>
                      )}
                    </div>

                    <Button
                      className="mt-4 w-full"
                      variant={hasAccounts ? "outline" : "default"}
                      disabled={!configurable || connecting === meta.key}
                      onClick={() => handleConnect(meta.key)}
                    >
                      {connecting === meta.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : hasAccounts ? (
                        <>
                          <Link2 className="h-4 w-4" /> Manage
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4" /> Connect
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!disconnectTarget}
        onOpenChange={(o) => !o && setDisconnectTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect account?</DialogTitle>
            <DialogDescription>
              This will revoke the OAuth token and stop publishing to{" "}
              <span className="font-medium text-foreground">
                {disconnectTarget?.display_name ||
                  platformMeta[disconnectTarget?.platform ?? ""]?.label ||
                  "this platform"}
              </span>
              . You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectTarget && handleDisconnect(disconnectTarget)}
            >
              <Unlink className="h-4 w-4" /> Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
