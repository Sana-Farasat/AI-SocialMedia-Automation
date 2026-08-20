"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/stores/auth";
import { toast } from "sonner";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { init } = useAuth();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = React.useState("Connecting your account…");

  React.useEffect(() => {
    (async () => {
      const platform =
        searchParams.get("platform") ||
        sessionStorage.getItem("sp_oauth_platform") ||
        "";
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const savedState = sessionStorage.getItem("sp_oauth_state");
      const error = searchParams.get("error");
      const redirect_uri = `${window.location.origin}/social-accounts/callback`;

      if (error) {
        setStatus("error");
        setMessage(`Authorization failed: ${error}`);
        toast.error(`Authorization failed: ${error}`);
        setTimeout(() => router.replace("/social-accounts"), 2500);
        return;
      }

      if (!platform || !code || !state) {
        setStatus("error");
        setMessage("Missing OAuth parameters.");
        setTimeout(() => router.replace("/social-accounts"), 2500);
        return;
      }

      if (savedState && savedState !== state) {
        setStatus("error");
        setMessage("Invalid OAuth state — please try again.");
        toast.error("Invalid OAuth state");
        setTimeout(() => router.replace("/social-accounts"), 2500);
        return;
      }

      try {
        const params = new URLSearchParams({
          platform,
          code,
          state,
        });
        const redirect = redirect_uri;
        await api.get(
          `/social-accounts/callback?${params}&redirect_uri=${encodeURIComponent(redirect)}`,
        );
        setStatus("success");
        setMessage("Account connected successfully!");
        toast.success("Account connected");
        sessionStorage.removeItem("sp_oauth_platform");
        sessionStorage.removeItem("sp_oauth_state");
        setTimeout(() => {
          router.replace("/social-accounts");
          router.refresh();
        }, 1200);
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Connection failed";
        setStatus("error");
        setMessage(msg);
        toast.error(msg);
        setTimeout(() => router.replace("/social-accounts"), 2500);
      }
    })();
  }, [searchParams, router, init]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      {status === "loading" && (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      )}
      {status === "success" && (
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
      )}
      {status === "error" && <XCircle className="h-12 w-12 text-red-500" />}
      <h1 className="text-lg font-semibold">
        {status === "loading"
          ? "Connecting"
          : status === "success"
            ? "Connected"
            : "Connection failed"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function OAuthCallback() {
  return (
    <Suspense fallback={<Loader2 className="mx-auto mt-32 h-8 w-8 animate-spin" />}>
      <CallbackInner />
    </Suspense>
  );
}
