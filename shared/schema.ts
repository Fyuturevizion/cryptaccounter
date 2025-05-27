import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  network: text("network").notNull(), // 'ethereum' | 'base'
  name: text("name"),
  startBlock: text("start_block"),
  endBlock: text("end_block"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id),
  hash: text("hash").notNull(),
  blockNumber: text("block_number").notNull(),
  timeStamp: text("time_stamp").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  value: text("value").notNull(),
  tokenName: text("token_name"),
  tokenSymbol: text("token_symbol"),
  tokenDecimal: text("token_decimal"),
  contractAddress: text("contract_address"),
  transactionType: text("transaction_type").notNull(), // 'TO' | 'FROM'
  amount: real("amount"),
  gasUsed: text("gas_used"),
  gasPrice: text("gas_price"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  network: text("network").notNull(), // 'ethereum' | 'base'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Validation schemas
export const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format");
export const blockNumberSchema = z.string().regex(/^\d+$|^latest$/, "Invalid block number format");
