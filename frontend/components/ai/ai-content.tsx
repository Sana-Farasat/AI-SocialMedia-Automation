"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Lightbulb,
  Hash,
  Repeat,
  Copy,
  Check,
  Loader2,
  Wand2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { GenerateResponse } from "@/lib/types";
import { getPlatform, platformMeta } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const platformOptions = Object.entries(platformMeta).map(([k, v]) => ({
  key: k,
  label: v.label,
}));

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Copy failed");
        }
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function ResultCard({
  result,
  index,
}: {
  result: GenerateResponse;
  index: number;
}) {
  const pf = result.platform ? getPlatform(result.platform) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {pf && <pf.icon className={cn("h-4 w-4", pf.text)} />}
            <CardTitle className="text-sm">
              {pf ? `${pf.label} version` : "Generated content"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Wand2 className="h-3 w-3" /> {result.provider}
            </Badge>
            <CopyButton text={result.content} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {result.content}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AIContent() {
  const [tab, setTab] = React.useState("generate");
  const [prompt, setPrompt] = React.useState("");
  const [platform, setPlatform] = React.useState<string | undefined>();
  const [tone, setTone] = React.useState<string | undefined>();
  const [rewriteText, setRewriteText] = React.useState("");
  const [style, setStyle] = React.useState("professional");
  const [results, setResults] = React.useState<GenerateResponse[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function run(kind: "generate" | "ideas" | "hashtags" | "rewrite") {
    setLoading(true);
    try {
      let res: GenerateResponse;
      if (kind === "rewrite") {
        if (!rewriteText.trim()) {
          toast.error("Enter content to rewrite.");
          setLoading(false);
          return;
        }
        res = await api.post<GenerateResponse>("/ai/rewrite", {
          text: rewriteText,
          style,
        });
      } else {
        const usePrompt = prompt.trim();
        if (!usePrompt) {
          toast.error("Describe your topic first.");
          setLoading(false);
          return;
        }
        res = await api.post<GenerateResponse>(
          kind === "ideas" || kind === "hashtags" ? `/ai/${kind}` : "/ai/generate",
          {
            prompt: usePrompt,
            platform,
            tone,
          },
        );
      }
      setResults((prev) => [res, ...prev].slice(0, 12));
      toast.success("Generated");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="generate" className="flex-1">
                    <Sparkles className="mr-1 h-4 w-4" /> Generate
                  </TabsTrigger>
                  <TabsTrigger value="rewrite" className="flex-1">
                    <Repeat className="mr-1 h-4 w-4" /> Rewrite
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4">
                  <div className="space-y-2">
                    <Label>What would you like to create?</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. A launch post for our new AI automation tool"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select
                        value={platform ?? "general"}
                        onValueChange={(v) =>
                          setPlatform(v === "general" ? undefined : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          {platformOptions.map((p) => (
                            <SelectItem key={p.key} value={p.key}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select
                        value={tone ?? "professional"}
                        onValueChange={(v) =>
                          setTone(v === "professional" ? undefined : v)
                        }
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={() => run("generate")}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      Generate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => run("ideas")}
                      disabled={loading}
                    >
                      <Lightbulb className="h-4 w-4" /> Ideas
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => run("hashtags")}
                      disabled={loading}
                    >
                      <Hash className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="rewrite" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content to rewrite</Label>
                    <Textarea
                      value={rewriteText}
                      onChange={(e) => setRewriteText(e.target.value)}
                      placeholder="Paste your current post…"
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="shorter">Shorter</SelectItem>
                        <SelectItem value="longer">Longer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => run("rewrite")}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Repeat className="h-4 w-4" />
                    )}
                    Rewrite
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-600/25">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  Your AI creative studio
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Generate on-brand captions, rewrite drafts, brainstorm ideas
                  and craft hashtags — all tuned per platform.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Recent generations ({results.length})
              </p>
              {results.map((r, i) => (
                <ResultCard key={i} result={r} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
