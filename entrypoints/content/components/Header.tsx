import {
  ArrowRight,
  MessageCircleMore,
  Pin,
  PinOff,
  Plus,
  Settings,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { SidebarType } from "@/entrypoints/types/navigation";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const Header = ({
  title,
  sidebarType,
  onClose,
  onNavChange,
  isPinned,
  onTogglePin,
}: {
  title: string;
  sidebarType: SidebarType;
  onClose: () => void;
  onNavChange: (type: SidebarType) => void;
  isPinned: boolean;
  onTogglePin: () => void;
}) => {
  const tooltipMapping = [
    {
      icon: <Plus className="h-5 w-5" />,
      tooltip: "Start a New Chat",
      action: () => onNavChange(SidebarType.newChat),
      className:
        "hover:bg-primary hover:text-primary-foreground transition-colors duration-200",
    },
    {
      icon: <MessageCircleMore className="h-4 w-4" />,
      type: SidebarType.home,
      tooltip: capitalize(SidebarType.home),
      action: () => onNavChange(SidebarType.home),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      type: SidebarType.settings,
      tooltip: capitalize(SidebarType.settings),
      action: () => onNavChange(SidebarType.settings),
    },
    {
      icon: isPinned ? (
        <PinOff className="h-4 w-4" />
      ) : (
        <Pin className="h-4 w-4" />
      ),
      tooltip: isPinned ? "Unpin Sidebar" : "Pin in Place",
      action: onTogglePin,
      className: isPinned
        ? "bg-primary text-primary-foreground"
        : "hover:bg-primary/10 transition-colors duration-200",
    },
    {
      icon: <X className="h-4 w-4" />,
      tooltip: "Close",
      action: onClose,
      className: "hover:bg-destructive hover:text-destructive-foreground",
    },
  ];

  return (
    <div className="flex justify-end items-center w-full border-b px-4 py-3">
      <div className="flex items-center gap-2">
        {tooltipMapping.map((item, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`hover:cursor-pointer flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors text-lg ${
                    item.type && item.type === sidebarType
                      ? "bg-primary text-primary-foreground"
                      : item.className || ""
                  }`}
                  onClick={item.action}
                >
                  {item.icon}
                  <span className="sr-only">{item.tooltip}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{item.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
};

export default Header;
