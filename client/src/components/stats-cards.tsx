import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardAnalytics {
  totalBalance: number;
  activeWallets: number;
  totalTransactions: number;
  monthlyPnL: number;
  balanceChange: string;
  pnlChange: string;
}

export function StatsCards() {
  const { data: analytics, isLoading } = useQuery<DashboardAnalytics>({
    queryKey: ["/api/analytics/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const stats = [
    {
      title: "Total Balance",
      value: formatCurrency(analytics.totalBalance),
      change: analytics.balanceChange,
      isPositive: analytics.balanceChange.startsWith('+'),
    },
    {
      title: "Active Wallets",
      value: analytics.activeWallets.toString(),
      subtitle: "2 Ethereum, 1 Base",
    },
    {
      title: "Transactions",
      value: analytics.totalTransactions.toLocaleString(),
      subtitle: "Last 30 days",
    },
    {
      title: "P&L This Month",
      value: formatCurrency(analytics.monthlyPnL),
      change: analytics.pnlChange,
      isPositive: analytics.monthlyPnL >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 cursor-pointer">
              <Copy className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>
            <div className="flex items-center text-sm">
              {stat.change && (
                <>
                  {stat.isPositive ? (
                    <span className="text-green-600 font-medium">{stat.change}</span>
                  ) : (
                    <span className="text-red-600 font-medium">{stat.change}</span>
                  )}
                </>
              )}
              {stat.subtitle && (
                <span className="text-gray-500">{stat.subtitle}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}