import { ResetPasswordPage } from "@/components/auth/reset-password-page";

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={token ?? ""} />;
}