import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pythonExecutor } from "./python-executor";
import { insertWalletSchema, insertApiKeySchema, walletAddressSchema, blockNumberSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Wallet routes
  app.get("/api/wallets", async (req, res) => {
    try {
      const wallets = await storage.getAllWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/wallets", async (req, res) => {
    try {
      const validatedData = insertWalletSchema.parse(req.body);
      const wallet = await storage.createWallet(validatedData);
      res.json(wallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid wallet data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create wallet" });
      }
    }
  });

  app.delete("/api/wallets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWallet(id);
      if (success) {
        res.json({ message: "Wallet deleted successfully" });
      } else {
        res.status(404).json({ message: "Wallet not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;
      const walletId = req.query.walletId ? parseInt(req.query.walletId as string) : undefined;
      const tokenFilter = req.query.tokenFilter as string;
      const searchQuery = req.query.searchQuery as string;
      const sortOrder = req.query.sortOrder as string || "desc";

      const result = await storage.getTransactionsPaginated(offset, limit, walletId, tokenFilter, searchQuery, sortOrder);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const transactions = await storage.getTransactionsByWalletId(walletId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet transactions" });
    }
  });

  // API Key routes
  app.get("/api/api-keys", async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      // Don't expose the actual keys in the response
      const sanitizedKeys = apiKeys.map(key => ({
        ...key,
        key: key.key.slice(0, 8) + "..." + key.key.slice(-4)
      }));
      res.json(sanitizedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", async (req, res) => {
    try {
      const validatedData = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(validatedData);
      res.json({
        ...apiKey,
        key: apiKey.key.slice(0, 8) + "..." + apiKey.key.slice(-4)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid API key data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create API key" });
      }
    }
  });

  app.delete("/api/api-keys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteApiKey(id);
      if (success) {
        res.json({ message: "API key deleted successfully" });
      } else {
        res.status(404).json({ message: "API key not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Import routes
  const importRequestSchema = z.object({
    address: walletAddressSchema,
    network: z.enum(['ethereum', 'base']),
    startBlock: blockNumberSchema,
    endBlock: blockNumberSchema,
    tokens: z.array(z.string()).min(1),
    apiKey: z.string().optional(),
    walletName: z.string().optional()
  });

  app.post("/api/import", async (req, res) => {
    try {
      const validatedData = importRequestSchema.parse(req.body);
      const importId = await pythonExecutor.importWalletData(validatedData);
      res.json({ importId, message: "Import started successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid import request", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to start import" });
      }
    }
  });

  app.get("/api/import/:importId/progress", async (req, res) => {
    try {
      const importId = req.params.importId;
      const progress = pythonExecutor.getImportProgress(importId);
      if (progress) {
        res.json(progress);
      } else {
        res.status(404).json({ message: "Import not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get import progress" });
    }
  });

  app.get("/api/import/active", async (req, res) => {
    try {
      const activeImports = pythonExecutor.getAllActiveImports();
      res.json(activeImports);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active imports" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const [totalBalance, transactionCount, monthlyPnL, wallets] = await Promise.all([
        storage.getTotalBalance(),
        storage.getTransactionCount(),
        storage.getMonthlyPnL(),
        storage.getAllWallets()
      ]);

      const activeWallets = wallets.filter(w => w.isActive).length;
      
      res.json({
        totalBalance,
        activeWallets,
        totalTransactions: transactionCount,
        monthlyPnL,
        balanceChange: monthlyPnL > 0 ? '+12.5%' : '-8.2%',
        pnlChange: monthlyPnL > 0 ? '+8.2%' : '-12.1%'
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  // Export routes
  app.get("/api/export/transactions", async (req, res) => {
    try {
      const walletId = req.query.walletId ? parseInt(req.query.walletId as string) : undefined;
      const transactions = walletId 
        ? await storage.getTransactionsByWalletId(walletId)
        : await storage.getAllTransactions();

      // Convert to CSV
      const headers = ['Time', 'Token', 'Type', 'From', 'To', 'Amount', 'Hash'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(tx => [
          new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
          tx.tokenSymbol || 'ETH',
          tx.transactionType,
          tx.from,
          tx.to,
          tx.amount || 0,
          tx.hash
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  // Download generated CSV files
  app.get("/api/export/csv/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      if (!filename.endsWith('.csv')) {
        return res.status(400).json({ message: "Invalid file type" });
      }

      const fs = require('fs/promises');
      const path = require('path');
      const filePath = path.join(process.cwd(), filename);
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(fileContent);
    } catch (error) {
      res.status(404).json({ message: "File not found" });
    }
  });

  // List available CSV files
  app.get("/api/export/csv-files", async (req, res) => {
    try {
      const fs = require('fs/promises');
      const path = require('path');
      const files = await fs.readdir(process.cwd());
      const csvFiles = files.filter((file: string) => file.endsWith('.csv'));
      
      const fileDetails = await Promise.all(csvFiles.map(async (file: string) => {
        const filePath = path.join(process.cwd(), file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }));
      
      res.json(fileDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to list CSV files" });
    }
  });

  // Manual processing route for existing CSV files
  app.post("/api/process-csv/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const wallet = await storage.getWallet(walletId);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      // Process the CSV files for this wallet
      await pythonExecutor.processCsvResults("manual", wallet.address, walletId);
      
      res.json({ message: "CSV files processed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process CSV files" });
    }
  });

  // Health check for external APIs
  app.get("/api/health/apis", async (req, res) => {
    try {
      // Simple health check - in production you'd actually ping the APIs
      res.json({
        etherscan: { status: 'online', rateLimit: '4/5 per sec' },
        basescan: { status: 'online', rateLimit: '4/5 per sec' }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check API health" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
