import { SettingsPanel } from "@/components/settings/settings-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, AI preferences, publishing defaults and security."
      />
      <SettingsPanel />
    </div>
  );
}
