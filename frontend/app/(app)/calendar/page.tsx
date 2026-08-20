import { ContentCalendar } from "@/components/calendar/content-calendar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SquarePen } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Calendar"
        description="Plan and manage your publishing schedule across all platforms."
        actions={
          <Link href="/create">
            <Button variant="gradient">
              <SquarePen className="h-4 w-4" /> Create post
            </Button>
          </Link>
        }
      />
      <ContentCalendar />
    </div>
  );
}
