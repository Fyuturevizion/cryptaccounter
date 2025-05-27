import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Copy, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, CheckCircle, Clock, ArrowUpDown } from "lucide-react";
import { formatAddress, formatAmount, formatCurrency, formatDateTime, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@shared/schema";

interface TransactionResponse {
  transactions: Transaction[];
  total: number;
}

interface TransactionTableProps {
  walletId?: number;
  pageSize?: number;
  showPagination?: boolean;
}

export function TransactionTable({ walletId, pageSize = 20, showPagination = true }: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // desc = newest first, asc = oldest first
  const { toast } = useToast();

  const offset = (currentPage - 1) * currentPageSize;

  const { data, isLoading, error } = useQuery<TransactionResponse>({
    queryKey: ["/api/transactions", { offset, limit: currentPageSize, walletId, tokenFilter, searchQuery, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: currentPageSize.toString(),
        ...(walletId && { walletId: walletId.toString() }),
        ...(tokenFilter && tokenFilter !== "all" && { tokenFilter }),
        ...(searchQuery && { searchQuery }),
        sortOrder,
      });
      
      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });

  const handleCopyAddress = async (address: string) => {
    try {
      await copyToClipboard(address);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const totalPages = data ? Math.ceil(data.total / currentPageSize) : 0;
  
  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Failed to load transactions
          </div>
        </CardContent>
      </Card>
    );
  }

  const transactions = data?.transactions || [];
  const total = data?.total || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex items-center space-x-3">
            {/* Sort by time button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="flex items-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">
                {sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </span>
              <ArrowUpDown className="w-3 h-3" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
            </div>
            <Select value={tokenFilter} onValueChange={setTokenFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No transactions found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="text-sm text-foreground">
                          {formatDateTime(transaction.timeStamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Block {parseInt(transaction.blockNumber).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {transaction.tokenSymbol?.slice(0, 2) || 'TK'}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {transaction.tokenName || transaction.tokenSymbol || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            transaction.transactionType === 'TO'
                              ? 'transaction-badge-incoming'
                              : 'transaction-badge-outgoing'
                          }
                        >
                          {transaction.transactionType === 'TO' ? (
                            <ArrowDown className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUp className="w-3 h-3 mr-1" />
                          )}
                          {transaction.transactionType === 'TO' ? 'Incoming' : 'Outgoing'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono text-foreground">
                          {formatAddress(
                            transaction.transactionType === 'TO' ? transaction.from : transaction.to
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                          onClick={() => handleCopyAddress(
                            transaction.transactionType === 'TO' ? transaction.from : transaction.to
                          )}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {transaction.transactionType === 'FROM' ? '-' : ''}
                          {formatAmount(transaction.amount || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(transaction.amount || 0)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="transaction-status-confirmed">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {Math.min(offset + 1, total)}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(offset + currentPageSize, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{total}</span>{" "}
                transactions
              </div>
              <div className="flex items-center space-x-4">
                {showPagination && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <select
                      value={currentPageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-2 py-1 text-sm border rounded bg-background"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
