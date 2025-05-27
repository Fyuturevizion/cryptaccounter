import { Button } from "@/components/ui/button";
import { Menu, Bell, Moon, User } from "lucide-react";

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="ml-4 lg:ml-0">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your crypto accounting data</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm">
          <Moon className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <Button variant="ghost" size="sm" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}