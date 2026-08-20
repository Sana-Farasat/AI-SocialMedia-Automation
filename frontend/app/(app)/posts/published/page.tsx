import { PostsList } from "@/components/posts/posts-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Published Posts" };

export default function PublishedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Published Posts"
        description="Everything you've successfully published across your platforms."
        actions={
          <Link href="/create">
            <Button variant="gradient">
              <Send className="h-4 w-4" /> New post
            </Button>
          </Link>
        }
      />
      <PostsList filter="published" />
    </div>
  );
}
