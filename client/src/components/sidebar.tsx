import { Home, ArrowRightLeft, Wallet, FileText, Settings, Key, HelpCircle, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, section: "main" },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft, section: "main" },
  { name: "Wallets", href: "/wallets", icon: Wallet, section: "main" },
  { name: "Reports", href: "/reports", icon: FileText, section: "main" },
];

const settingsNavigation = [
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Export Data", href: "/export", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <SidebarContent location={location} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent location={location} />
      </div>
    </>
  );
}

function SidebarContent({ location }: { location: string }) {
  return (
    <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center flex-shrink-0 px-6 py-5">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CL</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">CryptoLedger</h1>
            <p className="text-xs text-gray-500">Treasury Accounting</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col">
        <div className="px-3">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            MAIN
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md"
                    )}
                  >
                    <item.icon
                      className={cn(
                        isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-5 w-5"
                      )}
                    />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings Navigation */}
        <div className="px-3 mt-8">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            SETTINGS
          </p>
          <nav className="space-y-1">
            {settingsNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md"
                    )}
                  >
                    <item.icon
                      className={cn(
                        isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-5 w-5"
                      )}
                    />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Help Section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <span className="ml-2 text-sm font-medium text-blue-900">Need help?</span>
            </div>
            <p className="mt-1 text-xs text-blue-700">
              Check our documentation or contact support.
            </p>
            <Button size="sm" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}