import { PostsList } from "@/components/posts/posts-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Scheduled Posts" };

export default function ScheduledPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Posts"
        description="Posts queued to publish automatically on your selected platforms."
        actions={
          <Link href="/create">
            <Button variant="gradient">
              <CalendarClock className="h-4 w-4" /> New post
            </Button>
          </Link>
        }
      />
      <PostsList filter="scheduled" />
    </div>
  );
}
