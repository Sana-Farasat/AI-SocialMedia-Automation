import { PostsList } from "@/components/posts/posts-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SquarePen } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Drafts" };

export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Drafts"
        description="Posts you've saved but haven't published yet."
        actions={
          <Link href="/create">
            <Button variant="gradient">
              <SquarePen className="h-4 w-4" /> New draft
            </Button>
          </Link>
        }
      />
      <PostsList filter="draft" />
    </div>
  );
}
