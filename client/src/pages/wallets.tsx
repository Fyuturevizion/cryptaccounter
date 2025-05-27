import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { formatAddress, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Wallet } from "@shared/schema";

const walletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format"),
  network: z.enum(['ethereum', 'base']),
  name: z.string().min(1, "Name is required"),
  startBlock: z.string().optional(),
  endBlock: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletSchema>;

export default function Wallets() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallets, isLoading } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });

  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      address: "",
      network: "ethereum",
      name: "",
      startBlock: "",
      endBlock: "",
    },
  });

  const addWalletMutation = useMutation({
    mutationFn: async (data: WalletFormData) => {
      const response = await apiRequest("POST", "/api/wallets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Wallet Added",
        description: "Wallet has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/wallets/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Wallet Deleted",
        description: "Wallet has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WalletFormData) => {
    addWalletMutation.mutate(data);
  };

  const handleDeleteWallet = (id: number) => {
    if (confirm("Are you sure you want to delete this wallet?")) {
      deleteWalletMutation.mutate(id);
    }
  };

  const getExplorerUrl = (address: string, network: string) => {
    const baseUrl = network === 'ethereum' 
      ? 'https://etherscan.io/address/' 
      : 'https://basescan.org/address/';
    return `${baseUrl}${address}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Wallets</h2>
            <p className="text-sm text-muted-foreground">
              Manage your connected wallets
            </p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wallets</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connected wallets
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Wallet</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Wallet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addWalletMutation.isPending}>
                    Add Wallet
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          {!wallets || wallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No wallets added yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your first wallet to start tracking transactions.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-medium">
                      {wallet.name || `Wallet ${wallet.id}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono">
                          {formatAddress(wallet.address)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1"
                          onClick={() => window.open(getExplorerUrl(wallet.address, wallet.network), '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {wallet.network}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wallet.isActive ? "default" : "secondary"}>
                        {wallet.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {wallet.createdAt ? new Date(wallet.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
