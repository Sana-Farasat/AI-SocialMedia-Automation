import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Coins,
  Database,
  FileText,
  Globe,
  Lock,
  MessageSquare,
  MousePointerClick,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Documentation" };

const freeStack = [
  { name: "Frontend & Backend hosting", detail: "Vercel Hobby (serverless, ~1M calls/mo free)" },
  { name: "Database", detail: "Neon Postgres (free tier, no card)" },
  { name: "AI content generation", detail: "Google Gemini free API tier" },
  { name: "Scheduler / worker", detail: "cron-job.org or GitHub Actions (free)" },
  { name: "Auth & security", detail: "JWT + bcrypt (in-app, no external cost)" },
  { name: "Object storage", detail: "Local storage during development (free)" },
];

const paidItems = [
  {
    platform: "X (Twitter)",
    icon: MessageSquare,
    cost: "Pay-per-use (~$0.01–0.015 per post)",
    status: "Paid required",
    note: "Free tier discontinued in 2026. Posting needs API credits in the X Developer Portal — no credits = 402 error.",
  },
  {
    platform: "Facebook / Instagram / Threads",
    icon: Send,
    cost: "Free to apply",
    status: "Approval required",
    note: "Publishing needs Meta App Review (pages_manage_posts, instagram_content_publish, threads_write). Login/connect works without it.",
  },
  {
    platform: "LinkedIn",
    icon: Zap,
    cost: "Free to apply",
    status: "Approval required",
    note: "w_member_social scope needs LinkedIn developer app approval for posting.",
  },
  {
    platform: "TikTok",
    icon: Sparkles,
    cost: "Free to apply",
    status: "Approval required",
    note: "video.publish scope needs TikTok app approval. Tokens also auto-refresh after 24h.",
  },
  {
    platform: "YouTube",
    icon: Bot,
    cost: "Free to apply",
    status: "Approval required",
    note: "youtube.upload scope needs Google OAuth consent-screen verification for production.",
  },
  {
    platform: "Production scale-up",
    icon: Wallet,
    cost: "Optional",
    status: "Only when scaling",
    note: "Vercel Pro (~$20/mo), Neon paid tier, and paid email/SMTP only when free limits are exceeded.",
  },
  {
    platform: "Optional integrations",
    icon: Coins,
    cost: "Optional",
    status: "Off by default",
    note: "Cloudinary / S3 / Supabase storage and SMTP email are wired in but empty in .env until enabled.",
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Documentation"
        description="What this platform does, what it costs, and how it can be extended."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> What is SocialPilot AI?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              SocialPilot AI is a multi-platform social media automation SaaS. You
              write one post — or let AI write it — and publish it across your
              connected social accounts, either immediately or on a schedule.
            </p>
            <div className="grid gap-2 pt-1">
              <Feature icon={Sparkles} text="AI content generation, rewriting and hashtags" />
              <Feature icon={Send} text="Publish now to multiple platforms in one click" />
              <Feature icon={CalendarClock} text="Schedule posts with a background worker" />
              <Feature icon={Globe} text="X, Facebook, Instagram, LinkedIn, Pinterest, TikTok, YouTube, Threads" />
              <Feature icon={FileText} text="Drafts, media uploads and per-platform status tracking" />
              <Feature icon={ShieldCheck} text="JWT auth, OAuth state validation, secure token storage" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Tech Stack & Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Frontend:</span>{" "}
              Next.js (App Router) + Tailwind CSS + shadcn/ui + Framer Motion.
            </p>
            <p>
              <span className="font-semibold text-foreground">Backend:</span>{" "}
              FastAPI (Python) + SQLModel / SQLAlchemy (async) + PostgreSQL.
            </p>
            <p>
              <span className="font-semibold text-foreground">Background worker:</span>{" "}
              A standalone APScheduler process polls the DB every 15s and publishes
              due posts. It can also be triggered via an HTTP endpoint for
              serverless deployments.
            </p>
            <p>
              <span className="font-semibold text-foreground">Auth:</span> JWT
              cookies with bcrypt password hashing.
            </p>
            <p>
              <span className="font-semibold text-foreground">Deployment:</span>{" "}
              Vercel (frontend + serverless API) + Neon (Postgres) — 100% free tier.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          <Zap className="mr-2 inline h-5 w-5 text-primary" />
          How the automation works
        </h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Step
                n={1}
                icon={MousePointerClick}
                title="You create a post"
                desc="Write it yourself, upload media, or let AI generate it."
              />
              <Step
                n={2}
                icon={Database}
                title="Post is saved"
                desc="Text + selected platforms stored in the database with a status."
              />
              <Step
                n={3}
                icon={Bot}
                title="AI content (optional)"
                desc="Gemini writes, rewrites, or adds hashtags before sending."
              />
              <Step
                n={4}
                icon={CalendarClock}
                title="Worker decides when"
                desc="Publish now = immediate. Scheduled = worker fires at the set time."
              />
              <Step
                n={5}
                icon={Send}
                title="Platform API call"
                desc="Posts go out to X, Facebook, LinkedIn, Pinterest and more."
              />
              <Step
                n={6}
                icon={CheckCircle2}
                title="Status tracked"
                desc="Published / failed states recorded, errors shown in the dashboard."
              />
            </div>

            <div className="mt-6 rounded-xl border border-dashed p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Example flow — a scheduled post
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">8:00 AM:</span> AI writes a
                post about your product &nbsp;→&nbsp; <span className="font-medium text-foreground">8:05 AM:</span> you
                schedule it for 5 PM &nbsp;→&nbsp; <span className="font-medium text-foreground">5:00 PM:</span> the worker
                publishes it to X and LinkedIn &nbsp;→&nbsp; <span className="font-medium text-foreground">5:00:30 PM:</span>{" "}
                your dashboard shows <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">Published</Badge>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          <Lock className="mr-2 inline h-5 w-5 text-primary" />
          Cost Breakdown
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Free parts (as configured)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {freeStack.map((item) => (
                <div
                  key={item.name}
                  className="flex items-start gap-2.5 rounded-lg border p-3"
                >
                  <Badge className="mt-0.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                    Free
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4 text-amber-500" /> Paid / approval-required parts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {paidItems.map((item) => (
                <div
                  key={item.platform}
                  className="flex items-start gap-2.5 rounded-lg border p-3"
                >
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.platform}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-amber-600">{item.cost}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-primary/40 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/10 to-primary/10">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Want this kind of AI automation for your business?
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                This project is a working example of custom AI automation — content
                generation, scheduling, and multi-platform publishing. The same
                approach can be tailored to your workflow: AI agents, webhooks,
                Telegram/Discord bots, data pipelines, or any repetitive task you
                want automated.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Custom AI automation", "Social media scheduling", "Telegram / Discord bots", "Webhook & data automation", "AI content pipelines"].map(
                  (tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> {tag}
                    </Badge>
                  ),
                )}
              </div>
            </div>
            <div className="shrink-0 space-y-2 rounded-xl border bg-background/60 p-4 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Hire me to build yours
              </p>
              <p className="text-sm font-semibold">Sana Farasat</p>
              <p className="text-sm">sanafarasat786@gmail.com</p>
              <p className="text-xs text-muted-foreground">
                Reach out via WhatsApp, email or social.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Feature({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border p-4">
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          <span className="mr-1 text-primary">{n}.</span> {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}