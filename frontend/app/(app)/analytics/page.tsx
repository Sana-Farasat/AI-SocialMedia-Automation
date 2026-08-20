import { Analytics } from "@/components/analytics/analytics";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track performance across your connected platforms."
      />
      <Analytics />
    </div>
  );
}
