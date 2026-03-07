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
  X,
} from "lucide-react";

interface SettingsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
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

export function SettingsSidebar({ selectedTab, onTabChange, isOpen, onClose }: SettingsSidebarProps) {
  return (
    <div
      className="h-full bg-sidebar flex flex-col"
      data-testid="settings-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border shrink-0 bg-gradient-primary">
        {isOpen ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                <img
                  src="/images/favicon-32x32.png"
                  alt="3D Model Muncher"
                />
              </div>
              <div>
                <h2
                  className="font-semibold text-white text-lg tracking-tight cursor-pointer hover:underline"
                  onClick={() => window.location.pathname = "/"}
                >
                  3D Model Muncher
                </h2>
                <p className="text-xs text-white/80 font-medium">Organize & Print</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 hover:backdrop-blur-sm border-0 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
              <img
                src="/images/favicon-16x16.png"
                alt="3D Model Muncher"
              />
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto" data-testid="settings-nav">
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
      )}
    </div>
  );
}
