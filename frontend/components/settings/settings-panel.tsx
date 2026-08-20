"use client";

import * as React from "react";
import {
  User,
  Sparkles,
  Share2,
  ShieldCheck,
  Save,
  Loader2,
  Camera,
} from "lucide-react";
import { useAuth } from "@/lib/stores/auth";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const timezones = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const languages = ["en", "es", "fr", "de", "hi", "pt", "ja", "zh"];

export function SettingsPanel() {
  const { user, updateUser, refresh } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  const [profile, setProfile] = React.useState({
    full_name: "",
    avatar_url: "",
  });
  const [ai, setAi] = React.useState({
    ai_provider: "",
    default_tone: "",
    default_language: "",
  });
  const [pub, setPub] = React.useState({ default_timezone: "" });
  const [pw, setPw] = React.useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  React.useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name ?? "",
        avatar_url: user.avatar_url ?? "",
      });
      setAi({
        ai_provider: user.ai_provider,
        default_tone: user.default_tone,
        default_language: user.default_language,
      });
      setPub({ default_timezone: user.default_timezone });
    }
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    try {
      await updateUser({
        full_name: profile.full_name,
        avatar_url: profile.avatar_url || undefined,
      });
      toast.success("Profile updated");
      await refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveAI() {
    setSaving(true);
    try {
      await updateUser({
        ai_provider: ai.ai_provider,
        default_tone: ai.default_tone,
        default_language: ai.default_language,
      });
      toast.success("AI settings updated");
      await refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function savePublishing() {
    setSaving(true);
    try {
      await updateUser({ default_timezone: pub.default_timezone });
      toast.success("Publishing settings updated");
      await refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (pw.new_password !== pw.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (pw.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/me/change-password", {
        current_password: pw.current_password,
        new_password: pw.new_password,
      });
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  }

  const field = "space-y-2";

  return (
    <Tabs defaultValue="profile">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="profile">
          <User className="mr-1.5 h-4 w-4" /> Profile
        </TabsTrigger>
        <TabsTrigger value="ai">
          <Sparkles className="mr-1.5 h-4 w-4" /> AI
        </TabsTrigger>
        <TabsTrigger value="publishing">
          <Share2 className="mr-1.5 h-4 w-4" /> Publishing
        </TabsTrigger>
        <TabsTrigger value="security">
          <ShieldCheck className="mr-1.5 h-4 w-4" /> Security
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile settings</CardTitle>
            <CardDescription>
              Update your personal information and avatar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg text-white">
                  {(user?.full_name || user?.email || "U")
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Avatar URL
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a URL to use a custom avatar image.
                </p>
              </div>
            </div>
            <div className={field}>
              <Label>Avatar URL</Label>
              <Input
                value={profile.avatar_url}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, avatar_url: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>
            <div className={field}>
              <Label>Full name</Label>
              <Input
                value={profile.full_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>
            <div className={field}>
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email is used for sign-in and notifications.
              </p>
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>AI settings</CardTitle>
            <CardDescription>
              Configure how the AI assistant generates your content.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-1">
            <div className={field}>
              <Label>AI provider</Label>
              <Select
                value={ai.ai_provider}
                onValueChange={(v) => setAi((p) => ({ ...p, ai_provider: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label>Default tone</Label>
              <Select
                value={ai.default_tone}
                onValueChange={(v) => setAi((p) => ({ ...p, default_tone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="witty">Witty</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <Label>Default language</Label>
              <Select
                value={ai.default_language}
                onValueChange={(v) =>
                  setAi((p) => ({ ...p, default_language: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveAI} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save AI settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="publishing" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Publishing settings</CardTitle>
            <CardDescription>
              Set defaults for scheduling and publishing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={field}>
              <Label>Default timezone</Label>
              <Select
                value={pub.default_timezone}
                onValueChange={(v) =>
                  setPub((p) => ({ ...p, default_timezone: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={savePublishing} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save publishing settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={field}>
              <Label>Current password</Label>
              <Input
                type="password"
                value={pw.current_password}
                onChange={(e) =>
                  setPw((p) => ({ ...p, current_password: e.target.value }))
                }
              />
            </div>
            <div className={field}>
              <Label>New password</Label>
              <Input
                type="password"
                value={pw.new_password}
                onChange={(e) =>
                  setPw((p) => ({ ...p, new_password: e.target.value }))
                }
              />
            </div>
            <div className={field}>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <Button
              variant="destructive"
              onClick={changePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Change password
            </Button>
            <Separator />
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Session</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You're signed in as{" "}
                <span className="font-medium text-foreground">
                  {user?.email}
                </span>
                . Your session is protected with HTTP-only, secure cookies.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
