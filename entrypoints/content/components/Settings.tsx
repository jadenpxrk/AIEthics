import { ApiKeySettings } from "@/components/settings/api-key-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <ThemeSettings />
      <ApiKeySettings />
    </div>
  );
}
