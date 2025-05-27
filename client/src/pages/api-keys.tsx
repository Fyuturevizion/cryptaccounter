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
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiKey } from "@shared/schema";

const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  key: z.string().min(10, "API key must be at least 10 characters"),
  network: z.enum(['ethereum', 'base']),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

export default function ApiKeys() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      name: "",
      key: "",
      network: "ethereum",
    },
  });

  const addApiKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormData) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "API Key Added",
        description: "API key has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "API key has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApiKeyFormData) => {
    addApiKeyMutation.mutate(data);
  };

  const handleDeleteApiKey = (id: number) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      deleteApiKeyMutation.mutate(id);
    }
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Manage your blockchain API keys
            </p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4 p-6">
              {[...Array(2)].map((_, i) => (
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
          <h2 className="text-2xl font-bold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your blockchain API keys for Etherscan and Basescan
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New API Key</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production Etherscan Key" {...field} />
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
                          <SelectItem value="ethereum">Ethereum (Etherscan)</SelectItem>
                          <SelectItem value="base">Base (Basescan)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Your API key"
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
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
                  <Button type="submit" disabled={addApiKeyMutation.isPending}>
                    Add API Key
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configured API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {!apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No API keys configured yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add API keys to enable blockchain data fetching.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {apiKey.network}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono">
                            {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.key}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {apiKey.createdAt ? new Date(apiKey.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteApiKey(apiKey.id)}
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

        <Card>
          <CardHeader>
            <CardTitle>API Key Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Etherscan API</h4>
              <p className="text-sm text-muted-foreground">
                Get your free API key from{" "}
                <a 
                  href="https://etherscan.io/apis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  etherscan.io/apis
                </a>
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Basescan API</h4>
              <p className="text-sm text-muted-foreground">
                Get your free API key from{" "}
                <a 
                  href="https://basescan.org/apis" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  basescan.org/apis
                </a>
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                API keys are stored securely and only used for blockchain data retrieval. 
                Rate limits apply based on your API key tier.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
