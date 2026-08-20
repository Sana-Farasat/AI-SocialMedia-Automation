import { socialBrandIcons, type BrandKey } from "@/components/social-icons";
import { MessagesSquare } from "lucide-react";

export interface PlatformInfo {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  ring: string;
  bg: string;
  text: string;
}

export const platformMeta: Record<string, PlatformInfo> = {
  instagram: {
    key: "instagram",
    label: "Instagram",
    icon: socialBrandIcons.instagram,
    color: "oklch(0.6 0.2 15)",
    ring: "ring-pink-500/40",
    bg: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600",
    text: "text-pink-500",
  },
  facebook: {
    key: "facebook",
    label: "Facebook",
    icon: socialBrandIcons.facebook,
    color: "oklch(0.55 0.2 260)",
    ring: "ring-blue-500/40",
    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
    text: "text-blue-500",
  },
  linkedin: {
    key: "linkedin",
    label: "LinkedIn",
    icon: socialBrandIcons.linkedin,
    color: "oklch(0.55 0.18 225)",
    ring: "ring-sky-600/40",
    bg: "bg-gradient-to-br from-sky-500 to-sky-700",
    text: "text-sky-600",
  },
  twitter: {
    key: "twitter",
    label: "X (Twitter)",
    icon: socialBrandIcons.twitter,
    color: "oklch(0.3 0.02 264)",
    ring: "ring-zinc-400/40",
    bg: "bg-gradient-to-br from-zinc-600 to-zinc-900",
    text: "text-zinc-200",
  },
  pinterest: {
    key: "pinterest",
    label: "Pinterest",
    icon: socialBrandIcons.pinterest,
    color: "oklch(0.58 0.2 20)",
    ring: "ring-red-500/40",
    bg: "bg-gradient-to-br from-red-500 to-red-700",
    text: "text-red-500",
  },
  tiktok: {
    key: "tiktok",
    label: "TikTok",
    icon: socialBrandIcons.tiktok,
    color: "oklch(0.3 0.02 264)",
    ring: "ring-zinc-400/40",
    bg: "bg-gradient-to-br from-cyan-400 via-zinc-800 to-pink-500",
    text: "text-cyan-400",
  },
  youtube: {
    key: "youtube",
    label: "YouTube",
    icon: socialBrandIcons.youtube,
    color: "oklch(0.58 0.2 25)",
    ring: "ring-red-500/40",
    bg: "bg-gradient-to-br from-red-500 to-red-600",
    text: "text-red-500",
  },
  threads: {
    key: "threads",
    label: "Threads",
    icon: socialBrandIcons.threads,
    color: "oklch(0.4 0.03 264)",
    ring: "ring-zinc-400/40",
    bg: "bg-gradient-to-br from-zinc-400 to-zinc-700",
    text: "text-zinc-400",
  },
};

export const platformKeys = Object.keys(platformMeta);

export function getPlatform(key: string): PlatformInfo {
  const brandKey = Object.keys(socialBrandIcons).includes(key)
    ? (key as BrandKey)
    : null;
  return (
    platformMeta[key] ??
    {
      key,
      label: key[0]?.toUpperCase() + key.slice(1),
      icon: brandKey ? socialBrandIcons[brandKey] : MessagesSquare,
      color: "oklch(0.5 0.1 260)",
      ring: "ring-zinc-400/40",
      bg: "bg-zinc-500",
      text: "text-zinc-400",
    }
  );
}

export const platformKeysMeta = Object.values(platformMeta);

export const statusMeta: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
    dot: "bg-zinc-400",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    dot: "bg-blue-500",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    dot: "bg-amber-500",
  },
  published: {
    label: "Published",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-500 border-red-500/30",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
    dot: "bg-zinc-400",
  },
};

export function getStatus(status: string) {
  return (
    statusMeta[status] ?? {
      label: status,
      className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
      dot: "bg-zinc-400",
    }
  );
}
