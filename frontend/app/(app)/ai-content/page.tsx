import { AIContent } from "@/components/ai/ai-content";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "AI Content" };

export default function AIContentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Content Studio"
        description="Create, refine and adapt content with your AI provider."
      />
      <AIContent />
    </div>
  );
}
