import { Button } from "../ui/button";
import {
  Settings,
  Layers,
  Tag,
  Archive,
  FileCheck,
  Heart,
  Upload,
  Beaker,
} from "lucide-react";

interface SettingsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "backup", label: "Backup", icon: Archive },
  { id: "integrity", label: "Integrity", icon: FileCheck },
  { id: "support", label: "Support", icon: Heart },
  { id: "config", label: "Configuration", icon: Upload },
  { id: "experimental", label: "Experimental", icon: Beaker },
];

export function SettingsSidebar({ selectedTab, onTabChange }: SettingsSidebarProps) {
  return (
    <div
      className="w-64 border-r border-border bg-sidebar h-full flex flex-col"
      data-testid="settings-sidebar"
    >
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-lg">Settings</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1" data-testid="settings-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? "default" : "ghost"}
              className="w-full justify-start gap-3"
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
