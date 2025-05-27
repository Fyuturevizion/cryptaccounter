import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, Clock } from "lucide-react";

const importSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format"),
  network: z.enum(['ethereum', 'base']),
  startBlock: z.string().regex(/^\d+$|^latest$/, "Invalid block number format"),
  endBlock: z.string().regex(/^\d+$|^latest$/, "Invalid block number format"),
  tokens: z.array(z.string()).min(1, "Select at least one token"),
  walletName: z.string().optional(),
});

type ImportFormData = z.infer<typeof importSchema>;

interface ImportProgress {
  walletAddress: string;
  status: 'pending' | 'fetching' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

const tokenOptions = {
  ethereum: [
    { symbol: 'ETH', address: 'native', isNative: true },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' }
  ],
  base: [
    { symbol: 'ETH', address: 'native', isNative: true },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
    { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' }
  ]
};

export function WalletImportForm() {
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      address: "0xe11a3c6d20B464c77ca7dBe8cF9E83c91Dd337Be",
      network: "ethereum",
      startBlock: "14978379",
      endBlock: "latest",
      tokens: ["ETH", "USDC", "USDT"],
      walletName: "My Treasury Wallet",
    },
  });

  const network = form.watch("network");
  const tokens = tokenOptions[network];

  const importMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      const response = await apiRequest("POST", "/api/import", data);
      return response.json();
    },
    onSuccess: (data) => {
      setImportId(data.importId);
      pollProgress(data.importId);
      toast({
        title: "Import Started",
        description: "Wallet import has been initiated. This may take several minutes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pollProgress = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/${id}/progress`);
        if (response.ok) {
          const progress: ImportProgress = await response.json();
          setImportProgress(progress);
          
          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            setImportProgress(null);
            setImportId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
            queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
            toast({
              title: "Import Completed",
              description: "Wallet data has been successfully imported.",
            });
          } else if (progress.status === 'error') {
            clearInterval(pollInterval);
            setImportProgress(null);
            setImportId(null);
            toast({
              title: "Import Failed",
              description: progress.error || "An error occurred during import.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Failed to poll progress:", error);
      }
    }, 2000);
  };

  const onSubmit = (data: ImportFormData) => {
    importMutation.mutate(data);
  };

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <Download className="w-5 h-5" />
          Import Wallet Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Wallet Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0xe11a3c6d20B464c77ca7dBe8cF9E83c91Dd337Be"
                        className="font-mono text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walletName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Wallet Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Treasury Wallet"
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Network</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="base">Base</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startBlock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Start Block</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="14978379"
                        className="font-mono text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endBlock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">End Block</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="latest"
                        className="font-mono text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tokens"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Token Contracts</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {tokens.map((token) => (
                      <FormField
                        key={token.symbol}
                        control={form.control}
                        name="tokens"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={token.symbol}
                              className="flex flex-row items-center space-x-3 space-y-0 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(token.symbol)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, token.symbol])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== token.symbol
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="flex flex-col space-y-1 cursor-pointer flex-1">
                                <span className="font-medium text-gray-900">{token.symbol}</span>
                                <code className="text-xs text-gray-500 font-mono">
                                  {token.isNative ? 'Native Token' : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                                </code>
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Estimated fetch time: 2-5 minutes</span>
              </div>
              <Button
                type="submit"
                disabled={importMutation.isPending || !!importProgress}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                {importMutation.isPending || importProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}