import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { WalletImportForm } from "@/components/wallet-import-form";
import { TransactionTable } from "@/components/transaction-table";

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Stats Cards - exactly like the CryptoLedger design */}
        <StatsCards />

        {/* Import Wallet Data Section */}
        <WalletImportForm />

        {/* Recent Transactions Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              <div className="flex items-center space-x-3">
                <button className="text-sm text-gray-500 hover:text-gray-700">
                  Newest First ↑
                </button>
                <select className="text-sm border-gray-300 rounded-md">
                  <option>All Tokens</option>
                  <option>ETH</option>
                  <option>USDC</option>
                  <option>USDT</option>
                </select>
              </div>
            </div>
          </div>
          <TransactionTable pageSize={10} showPagination={false} />
        </div>
      </div>
    </div>
  );
}