import { PostComposer } from "@/components/create/post-composer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Create Post",
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create a new post"
        description="Write content, let AI polish it, pick platforms, and publish or schedule."
      />
      <PostComposer draftId={draft} />
    </div>
  );
}
