import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionTable } from "@/components/transaction-table";
import type { Wallet } from "@shared/schema";

export default function Transactions() {
  const [selectedWalletId, setSelectedWalletId] = useState<number | undefined>();

  const { data: wallets } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all your transaction data
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedWalletId?.toString() || "all"}
            onValueChange={(value) => setSelectedWalletId(value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Wallets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Wallets</SelectItem>
              {wallets?.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id.toString()}>
                  {wallet.name || `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TransactionTable walletId={selectedWalletId} pageSize={25} />
    </div>
  );
}
