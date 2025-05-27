import { wallets, transactions, apiKeys, type Wallet, type Transaction, type ApiKey, type InsertWallet, type InsertTransaction, type InsertApiKey } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Wallet operations
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  getAllWallets(): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, wallet: Partial<InsertWallet>): Promise<Wallet | undefined>;
  deleteWallet(id: number): Promise<boolean>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByWalletId(walletId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  getTransactionByHash(hash: string): Promise<Transaction | undefined>;
  getTransactionsPaginated(offset: number, limit: number, walletId?: number, tokenFilter?: string, searchQuery?: string, sortOrder?: string): Promise<{ transactions: Transaction[], total: number }>;

  // API Key operations
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByNetwork(network: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<boolean>;

  // Analytics
  getWalletBalance(walletId: number): Promise<number>;
  getTotalBalance(): Promise<number>;
  getTransactionCount(): Promise<number>;
  getMonthlyPnL(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getWallet(id: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet || undefined;
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.address, address));
    return wallet || undefined;
  }

  async getAllWallets(): Promise<Wallet[]> {
    return await db.select().from(wallets);
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db
      .insert(wallets)
      .values(insertWallet)
      .returning();
    return wallet;
  }

  async updateWallet(id: number, updateData: Partial<InsertWallet>): Promise<Wallet | undefined> {
    const [wallet] = await db
      .update(wallets)
      .set(updateData)
      .where(eq(wallets.id, id))
      .returning();
    return wallet || undefined;
  }

  async deleteWallet(id: number): Promise<boolean> {
    const result = await db.delete(wallets).where(eq(wallets.id, id));
    return result.rowCount > 0;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByWalletId(walletId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.walletId, walletId));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async createTransactions(insertTransactions: InsertTransaction[]): Promise<Transaction[]> {
    return await db
      .insert(transactions)
      .values(insertTransactions)
      .returning();
  }

  async getTransactionByHash(hash: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.hash, hash));
    return transaction || undefined;
  }

  async getTransactionsPaginated(offset: number, limit: number, walletId?: number, tokenFilter?: string, searchQuery?: string, sortOrder?: string): Promise<{ transactions: Transaction[], total: number }> {
    let query = db.select().from(transactions);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(transactions);

    const conditions = [];
    if (walletId) {
      conditions.push(eq(transactions.walletId, walletId));
    }
    if (tokenFilter) {
      conditions.push(eq(transactions.tokenSymbol, tokenFilter));
    }
    if (searchQuery) {
      const searchPattern = `%${searchQuery.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${transactions.hash})`, searchPattern),
          like(sql`lower(${transactions.from})`, searchPattern),
          like(sql`lower(${transactions.to})`, searchPattern),
          like(sql`lower(${transactions.tokenSymbol})`, searchPattern)
        )
      );
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    // Add ordering based on sortOrder parameter
    const orderBy = sortOrder === "asc" ? asc(transactions.timeStamp) : desc(transactions.timeStamp);
    
    const [transactionResults, countResults] = await Promise.all([
      query.orderBy(orderBy).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      transactions: transactionResults,
      total: countResults[0].count
    };
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByNetwork(network: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(
      and(eq(apiKeys.network, network), eq(apiKeys.isActive, true))
    );
    return apiKey || undefined;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async updateApiKey(id: number, updateData: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey || undefined;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.rowCount > 0;
  }

  async getWalletBalance(walletId: number): Promise<number> {
    const walletTransactions = await this.getTransactionsByWalletId(walletId);
    return walletTransactions.reduce((balance, tx) => {
      const amount = tx.amount || 0;
      return tx.transactionType === 'TO' ? balance + amount : balance - amount;
    }, 0);
  }

  async getTotalBalance(): Promise<number> {
    const allTransactions = await this.getAllTransactions();
    
    // Calculate balance from ERC-20 token transactions (USDC, USDT, etc.)
    const erc20Balance = allTransactions
      .filter(tx => tx.tokenSymbol !== 'ETH')
      .reduce((balance, tx) => {
        const amount = tx.amount || 0;
        return tx.transactionType === 'TO' ? balance + amount : balance - amount;
      }, 0);
    
    // Get actual ETH balance from blockchain for accurate calculation
    try {
      const wallets = await this.getAllWallets();
      let totalEthBalance = 0;
      
      for (const wallet of wallets) {
        if (wallet.network === 'ethereum') {
          // Fetch real ETH balance from Etherscan API
          const response = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${wallet.address}&tag=latest&apikey=14FXCDBK2YRHZM2F77TZ2JV25HG7F9ADG1`);
          const data = await response.json();
          
          if (data.status === '1' && data.result) {
            const ethBalance = parseFloat(data.result) / Math.pow(10, 18); // Convert wei to ETH
            totalEthBalance += ethBalance;
          }
        }
      }
      
      // Convert ETH to USD (using approximate price of $3200)
      const ethPriceUSD = 3200;
      const ethBalanceUSD = totalEthBalance * ethPriceUSD;
      
      return erc20Balance + ethBalanceUSD;
    } catch (error) {
      console.error('Failed to fetch ETH balance:', error);
      // Fallback to transaction-based calculation if API fails
      return erc20Balance;
    }
  }

  async getTransactionCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    return result.count;
  }

  async getMonthlyPnL(): Promise<number> {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const startTimestamp = Math.floor(startOfMonth.getTime() / 1000).toString();
    const endTimestamp = Math.floor(endOfMonth.getTime() / 1000).toString();
    
    const monthlyTransactions = await db.select().from(transactions).where(
      and(
        sql`${transactions.timeStamp} >= ${startTimestamp}`,
        sql`${transactions.timeStamp} <= ${endTimestamp}`
      )
    );

    return monthlyTransactions.reduce((pnl, tx) => {
      const amount = tx.amount || 0;
      return tx.transactionType === 'TO' ? pnl + amount : pnl - amount;
    }, 0);
  }
}

export const storage = new DatabaseStorage();
