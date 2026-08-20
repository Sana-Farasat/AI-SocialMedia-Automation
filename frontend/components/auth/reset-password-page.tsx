"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Rocket,
  Lock,
  Loader2,
  ArrowRight,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage({ token }: { token: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post<{ message: string }>("/auth/reset-password", {
        token,
        new_password: data.new_password,
      });
      toast.success("Password updated — sign in with your new password");
      router.replace("/login");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(msg);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-6 sm:p-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-600/30">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            SocialPilot <span className="text-primary">AI</span>
          </span>
        </div>

        {!token ? (
          <div className="space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Invalid reset link
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This link is missing or malformed. Request a new one to reset
                your password.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">
                <ArrowLeft className="h-4 w-4" /> Request a new link
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Set a new password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="At least 8 characters"
                    className="pl-10"
                    {...register("new_password")}
                  />
                </div>
                {errors.new_password && (
                  <p className="text-xs text-destructive">
                    {errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    className="pl-10"
                    {...register("confirm")}
                  />
                </div>
                {errors.confirm && (
                  <p className="text-xs text-destructive">
                    {errors.confirm.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Update password <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}