"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  Sparkles,
  CalendarClock,
  BarChart3,
  Users,
  Plug,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { platformMeta } from "@/lib/platforms";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Content",
    description:
      "Create on-brand posts in seconds with AI that understands your audience and tone.",
  },
  {
    icon: CalendarClock,
    title: "Smart Scheduling",
    description:
      "Plan and auto-publish across every platform from one clean calendar view.",
  },
  {
    icon: BarChart3,
    title: "Unified Analytics",
    description:
      "Track performance, engagement and growth for all your accounts in one place.",
  },
  {
    icon: Users,
    title: "Multi-Platform Reach",
    description:
      "Instagram, Facebook, LinkedIn, X, Pinterest, TikTok, YouTube and Threads.",
  },
];

interface Step {
  title: string;
  desc: string;
}

interface PlatformWorkflow {
  key: string;
  tagline: string;
  solves: string[];
  steps: Step[];
  highlights: string[];
}

const workflows: Record<string, PlatformWorkflow> = {
  instagram: {
    key: "instagram",
    tagline: "Feed posts, Reels & Stories on autopilot.",
    solves: [
      "Never miss a post — publish while you focus on creating",
      "Forget hashtags & captions — AI writes them for you",
      "No more gambling on timing — post when audience is online",
    ],
    steps: [
      {
        title: "Connect your account",
        desc: "Securely link your Instagram via OAuth. No password needed, ever.",
      },
      {
        title: "Create with AI",
        desc: "Generate captions, hashtags and image ideas tuned for your brand.",
      },
      {
        title: "Schedule or publish",
        desc: "Pick the best posting time and SocialPilot AI pushes it live for you.",
      },
      {
        title: "Track growth",
        desc: "Follow engagement, reach and follower trends per post.",
      },
    ],
    highlights: ["Auto-publish feed & Reels", "Smart hashtag suggestions", "Best-time scheduler"],
  },
  facebook: {
    key: "facebook",
    tagline: "Pages, groups & cross-posting made easy.",
    solves: [
      "Manage pages & groups without logging in daily",
      "Manual cross-posting is gone — one click publishes both",
      "Post at peak hours without staying up at night",
    ],
    steps: [
      {
        title: "Connect your page",
        desc: "Authorize with the Facebook API and pick which pages to manage.",
      },
      {
        title: "Craft & preview",
        desc: "Preview exactly how your post looks before it goes live.",
      },
      {
        title: "Schedule smart",
        desc: "Automate posting to your page audience at peak activity hours.",
      },
      {
        title: "Analyze reach",
        desc: "Understand impressions, clicks and audience growth over time.",
      },
    ],
    highlights: ["Page & group publishing", "Cross-post to Instagram", "Audience insights"],
  },
  linkedin: {
    key: "linkedin",
    tagline: "Professional content for your network.",
    solves: [
      "Keep a pro presence without writing every single day",
      "Never post at the wrong time for B2B audiences",
      "Stop tracking manually — growth is measured for you",
    ],
    steps: [
      {
        title: "Connect your profile",
        desc: "Trusted OAuth connection to your personal or company page.",
      },
      {
        title: "Create pro content",
        desc: "AI drafts professional posts, articles and engagement questions.",
      },
      {
        title: "Schedule ahead",
        desc: "Queue weeks of B2B content at the times professionals engage.",
      },
      {
        title: "Measure influence",
        desc: "Track impressions, reactions and connection growth.",
      },
    ],
    highlights: ["Company page support", "B2B-optimized copy", "Engagement analytics"],
  },
  twitter: {
    key: "twitter",
    tagline: "Tweets, threads & replies on schedule.",
    solves: [
      "Build threads & tweets in minutes, not hours",
      "Stay active on X even when you are offline",
      "Know what actually lands with real engagement data",
    ],
    steps: [
      {
        title: "Connect your account",
        desc: "Link your X account through a secure OAuth handshake.",
      },
      {
        title: "Compose with AI",
        desc: "Generate punchy tweets or multi-part threads in one click.",
      },
      {
        title: "Auto-schedule",
        desc: "Publish at your best times, even while you sleep.",
      },
      {
        title: "Watch performance",
        desc: "Monitor impressions, likes, retweets and follower trends.",
      },
    ],
    highlights: ["Thread builder", "Best-time queue", "Real-time analytics"],
  },
  pinterest: {
    key: "pinterest",
    tagline: "Pins that drive traffic to your site.",
    solves: [
      "Stop pinning sporadically — keep boards alive on autopilot",
      "No more guessing keywords — AI ranks your pins",
      "Turn pins into real, measurable website traffic",
    ],
    steps: [
      {
        title: "Connect your boards",
        desc: "Authorize Pinterest and choose which boards you manage.",
      },
      {
        title: "Create pins with AI",
        desc: "Design ideas, keywords and descriptions that rank in search.",
      },
      {
        title: "Schedule pins",
        desc: "Keep boards active with a steady stream of fresh content.",
      },
      {
        title: "Track clicks",
        desc: "Measure saves, clicks and traffic straight to your website.",
      },
    ],
    highlights: ["SEO-ready keywords", "Board-level scheduling", "Traffic analytics"],
  },
  tiktok: {
    key: "tiktok",
    tagline: "Viral-ready videos, posted at the right moment.",
    solves: [
      "Hit the exact window when your audience is scrolling",
      "Never run out of ideas — AI spots trends & hooks",
      "Watch growth without ever tracking it manually",
    ],
    steps: [
      {
        title: "Connect your account",
        desc: "Secure OAuth link to your TikTok Business account.",
      },
      {
        title: "Plan content",
        desc: "AI suggests trending formats, hooks and hashtags.",
      },
      {
        title: "Schedule uploads",
        desc: "Auto-publish videos when your audience is scrolling.",
      },
      {
        title: "See what works",
        desc: "Track views, likes, shares and follower growth.",
      },
    ],
    highlights: ["Trend-aware AI ideas", "Auto video publishing", "Growth analytics"],
  },
  youtube: {
    key: "youtube",
    tagline: "Videos that land ready-optimized.",
    solves: [
      "Skipped titles & tags are gone — AI optimizes discovery",
      "No more upload anxiety — schedule and forget",
      "See exactly what grows your watch time",
    ],
    steps: [
      {
        title: "Connect your channel",
        desc: "Link your channel through the YouTube Data API.",
      },
      {
        title: "Publish with metadata",
        desc: "AI helps with titles, descriptions and tags for discovery.",
      },
      {
        title: "Schedule premieres",
        desc: "Choose the perfect time and YouTube publishes automatically.",
      },
      {
        title: "Track it all",
        desc: "Views, watch time and subscriber growth in one view.",
      },
    ],
    highlights: ["Title & tag suggestions", "Thumbnail-ready metadata", "Watch-time analytics"],
  },
  threads: {
    key: "threads",
    tagline: "Conversations that keep your audience engaged.",
    solves: [
      "Stay in the conversation without the daily workflow",
      "Turn casual followers into real, lasting engagement",
      "Post consistently without the manual grind",
    ],
    steps: [
      {
        title: "Connect your profile",
        desc: "Secure connection to your Threads account.",
      },
      {
        title: "Write quick posts",
        desc: "Draft text and photo posts quickly with AI assistance.",
      },
      {
        title: "Schedule & publish",
        desc: "Keep a steady conversation going without the daily grind.",
      },
      {
        title: "Grow the thread",
        desc: "Track replies, reposts and follower growth.",
      },
    ],
    highlights: ["Fast text & photo posts", "Auto-scheduling", "Engagement stats"],
  },
};

export default function Home() {
  const [openPlatform, setOpenPlatform] = React.useState<string | null>(null);
  const workflow = openPlatform ? workflows[openPlatform] : null;
  const swar = openPlatform ? platformMeta[openPlatform] : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-20" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-600/30">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            SocialPilot <span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
            <Sparkles className="h-4 w-4 text-fuchsia-500" />
            AI-Powered Social Media Automation
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Publish everywhere.
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Grow everywhere.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            One dashboard to create AI-powered content and publish to
            Instagram, Facebook, LinkedIn, X, Pinterest, TikTok, YouTube and
            Threads. Schedule smarter, post faster, grow bigger.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="gradient" size="lg" asChild>
              <Link href="/register">
                Start for free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Sign in to your workspace</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card/60 p-6 text-left backdrop-blur transition-colors hover:bg-card"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/15 to-fuchsia-600/15">
                <f.icon className="h-5 w-5 text-fuchsia-500" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-24 w-full"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works on{" "}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              every platform
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tap any platform to see how SocialPilot AI connects, creates,
            schedules and measures your content.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.keys(platformMeta).map((key) => {
              const meta = platformMeta[key];
              const wf = workflows[key];
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  onClick={() => setOpenPlatform(key)}
                  className="group flex flex-col rounded-xl border bg-card/60 p-6 text-left backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-fuchsia-600/10"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${meta.bg} p-2.5 text-white shadow-lg`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{meta.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {wf?.tagline}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {wf?.solves.map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                        <span className="text-left leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                  <span className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${meta.text}`}>
                    See how it works
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>
      </main>

      <footer className="relative z-10 mt-24 border-t border-card bg-card/40 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-600/30">
                  <Rocket className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">
                  SocialPilot <span className="text-primary">AI</span>
                </span>
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                One dashboard to create AI-powered content and publish across
                every major social platform. Schedule smarter, post faster,
                grow bigger.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/register" className="text-muted-foreground transition-colors hover:text-primary">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-muted-foreground transition-colors hover:text-primary">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-muted-foreground transition-colors hover:text-primary">
                    Workspace
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Platforms
              </h4>
              <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {Object.keys(platformMeta).map((key) => {
                  const meta = platformMeta[key];
                  const Icon = meta.icon;
                  return (
                    <li key={key}>
                      <button
                        onClick={() => setOpenPlatform(key)}
                        className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Icon className={`h-4 w-4 ${meta.text}`} />
                        {meta.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Get started
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Join creators and brands publishing on autopilot with AI.
              </p>
              <Button variant="gradient" className="w-full" asChild>
                <Link href="/register">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
            <p>
              © {new Date().getFullYear()} SocialPilot AI. All rights
              reserved.
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-fuchsia-500" />
              Publish everywhere. Grow everywhere.
            </p>
          </div>
        </div>
      </footer>

      <Dialog
        open={!!workflow}
        onOpenChange={(open) => !open && setOpenPlatform(null)}
      >
        <DialogContent className="max-w-lg">
          {workflow && swar ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${swar.bg} p-2 text-white`}
                  >
                    <swar.icon className="h-5 w-5" />
                  </div>
                  {swar.label}
                </DialogTitle>
                <DialogDescription>{workflow.tagline}</DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-5">
                {workflow.steps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    <div
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${swar.bg} text-sm font-semibold text-white`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 font-medium">
                        {i === 0 && <Plug className="h-4 w-4 text-muted-foreground" />}
                        {i === 1 && <Sparkles className="h-4 w-4 text-muted-foreground" />}
                        {i === 2 && <CalendarClock className="h-4 w-4 text-muted-foreground" />}
                        {i === 3 && <BarChart3 className="h-4 w-4 text-muted-foreground" />}
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 border-t pt-4">
                {workflow.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {h}
                  </span>
                ))}
              </div>

              <Button variant="gradient" className="mt-2 w-full" asChild>
                <Link href="/register" onClick={() => setOpenPlatform(null)}>
                  Start with {swar.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}