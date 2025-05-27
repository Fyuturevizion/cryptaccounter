import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { storage } from './storage';
import type { InsertTransaction } from '@shared/schema';

export interface WalletImportRequest {
  address: string;
  network: 'ethereum' | 'base';
  startBlock: string;
  endBlock: string;
  tokens: string[];
  apiKey?: string;
  walletName?: string;
}

export interface ImportProgress {
  walletAddress: string;
  status: 'pending' | 'fetching' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class PythonExecutor {
  private activeImports: Map<string, ImportProgress> = new Map();

  async importWalletData(request: WalletImportRequest): Promise<string> {
    const importId = `${request.address}-${Date.now()}`;
    
    // Initialize progress tracking
    this.activeImports.set(importId, {
      walletAddress: request.address,
      status: 'pending',
      progress: 0,
      message: 'Initializing import...'
    });

    // Start the import process
    this.executeImport(importId, request).catch(error => {
      this.updateProgress(importId, {
        status: 'error',
        progress: 0,
        message: 'Import failed',
        error: error.message
      });
    });

    return importId;
  }

  private async executeImport(importId: string, request: WalletImportRequest): Promise<void> {
    try {
      // Update progress
      this.updateProgress(importId, {
        status: 'fetching',
        progress: 10,
        message: 'Connecting to blockchain API...'
      });

      // Create wallet record
      const existingWallet = await storage.getWalletByAddress(request.address);
      let wallet;
      
      if (existingWallet) {
        // Update wallet name if provided
        if (request.walletName && existingWallet.name !== request.walletName) {
          wallet = await storage.updateWallet(existingWallet.id, {
            name: request.walletName
          });
        } else {
          wallet = existingWallet;
        }
      } else {
        // Create new wallet with custom name or default
        const walletName = request.walletName || `Wallet ${request.address.slice(0, 6)}...${request.address.slice(-4)}`;
        wallet = await storage.createWallet({
          address: request.address,
          network: request.network,
          startBlock: request.startBlock,
          endBlock: request.endBlock,
          name: walletName,
          isActive: true
        });
      }

      // Create modified Python script with request parameters
      const scriptContent = await this.createCustomPythonScript(request);
      const tempDir = path.join(process.cwd(), 'temp');
      const tempScriptPath = path.join(tempDir, `etherapi_${importId}.py`);
      
      // Ensure temp directory exists with proper permissions
      try {
        await fs.mkdir(tempDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, that's okay
        console.log('Temp directory creation info:', error);
      }
      
      await fs.writeFile(tempScriptPath, scriptContent);

      this.updateProgress(importId, {
        status: 'fetching',
        progress: 30,
        message: 'Fetching transaction data...'
      });

      // Execute Python script
      await this.runPythonScript(tempScriptPath, importId);

      this.updateProgress(importId, {
        status: 'processing',
        progress: 70,
        message: 'Processing transaction data...'
      });

      // Parse CSV results and store in database
      await this.processCsvResults(importId, request.address, wallet.id);

      this.updateProgress(importId, {
        status: 'completed',
        progress: 100,
        message: 'Import completed successfully'
      });

      // Cleanup temp files
      await fs.unlink(tempScriptPath).catch(() => {}); // Ignore errors

    } catch (error) {
      this.updateProgress(importId, {
        status: 'error',
        progress: 0,
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async createCustomPythonScript(request: WalletImportRequest): Promise<string> {
    const originalScript = await fs.readFile(path.join(process.cwd(), 'attached_assets', 'etherapi.py'), 'utf-8');
    
    // Get API key from storage or use provided one
    let apiKey = request.apiKey;
    if (!apiKey) {
      const storedKey = await storage.getApiKeyByNetwork(request.network);
      apiKey = storedKey?.key || process.env.ETHERSCAN_API_KEY || "14FXCDBK2YRHZM2F77TZ2JV25HG7F9ADG1";
    }

    // Modify the script with custom parameters
    let modifiedScript = originalScript
      .replace(/API_KEY = ".*"/, `API_KEY = "${apiKey}"`)
      .replace(/ADDRESS = ".*"/, `ADDRESS = "${request.address}"`)
      .replace(/START_BLOCK = ".*"/, `START_BLOCK = "${request.startBlock}"`)
      .replace(/END_BLOCK = ".*"/, `END_BLOCK = "${request.endBlock}"`)
      .replace(/os\.makedirs\('temp', exist_ok=True\)/, `# temp directory handled by Node.js`)
      .replace(/temp\//g, '');

    // Modify BASE_URL for different networks
    if (request.network === 'base') {
      modifiedScript = modifiedScript.replace(
        'BASE_URL = "https://api.etherscan.io/api"',
        'BASE_URL = "https://api.basescan.org/api"'
      );
    }

    // Modify tokens to fetch based on request
    if (request.tokens && request.tokens.length > 0) {
      const erc20Tokens = request.tokens.filter(symbol => symbol !== 'ETH');
      const shouldFetchEth = request.tokens.includes('ETH');
      
      // Configure ERC-20 tokens
      if (erc20Tokens.length > 0) {
        const tokenConfig = erc20Tokens.map(symbol => {
          const contracts: Record<string, string> = {
            'USDC': request.network === 'ethereum' ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            'USDT': request.network === 'ethereum' ? '0xdAC17F958D2ee523a2206206994597C13D831ec7' : '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
          };
          return `{"symbol": "${symbol}", "contract_address": "${contracts[symbol] || ''}"}`;
        }).join(',\n        ');

        modifiedScript = modifiedScript.replace(
          /tokens_to_fetch = \[[\s\S]*?\]/,
          `tokens_to_fetch = [\n        ${tokenConfig}\n    ]`
        );
      } else {
        // No ERC-20 tokens, empty the list
        modifiedScript = modifiedScript.replace(
          /tokens_to_fetch = \[[\s\S]*?\]/,
          `tokens_to_fetch = []`
        );
      }
      
      // Add ETH transaction fetching if requested
      if (shouldFetchEth) {
        modifiedScript = modifiedScript.replace(
          /# Main execution[\s\S]*?print\("Script finished processing all specified tokens."\)/,
          `# Main execution
if __name__ == "__main__":
    all_transactions_by_token = {}
    
    # Fetch ETH transactions
    print("\\nFetching ETH transactions...")
    eth_transactions = get_eth_transactions(ADDRESS, START_BLOCK, END_BLOCK, API_KEY)
    if eth_transactions:
        all_transactions_by_token["ETH"] = eth_transactions
        print(f"Fetched {len(eth_transactions)} ETH transactions")
    
    # Fetch ERC20 token transfers
    for token in tokens_to_fetch:
        token_symbol = token["symbol"]
        contract_address = token["contract_address"]
        
        if not contract_address:
            print(f"Skipping {token_symbol} - no contract address")
            continue
            
        transactions = get_erc20_token_transfers(token_symbol, contract_address, ADDRESS, START_BLOCK, END_BLOCK, API_KEY)
        
        if transactions:
            all_transactions_by_token[token_symbol] = transactions
            print(f"Fetched {len(transactions)} {token_symbol} transactions")
        else:
            print(f"No {token_symbol} transactions found")

    # Create combined CSV if we have any transactions
    if all_transactions_by_token:
        combined_output_filename = f"combined_transfers_{ADDRESS.replace('0x', '')[:6]}.csv"
        create_combined_csv(all_transactions_by_token, combined_output_filename)

    print("\\nScript finished processing all specified tokens.")`
        );
      }
    }

    return modifiedScript;
  }

  private async runPythonScript(scriptPath: string, importId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        const lines = output.split('\n');
        const lastLine = lines[lines.length - 2]; // -2 because last is empty
        
        if (lastLine) {
          // Parse progress from Python output
          if (lastLine.includes('Fetching page')) {
            this.updateProgress(importId, {
              status: 'fetching',
              progress: Math.min(60, 30 + Math.random() * 30),
              message: lastLine.trim()
            });
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  async processCsvResults(importId: string, walletAddress: string, walletId: number): Promise<void> {
    // Check for CSV files in current directory (where Python script creates them)
    const files = await fs.readdir(process.cwd());
    
    // Find both ERC-20 and ETH CSV files for this wallet
    const walletSuffix = walletAddress.replace('0x', '').slice(-6).toLowerCase();
    const erc20Files = files.filter(file => 
      file.includes(walletAddress.replace('0x', '').slice(0, 6)) && 
      file.endsWith('.csv') && 
      file.startsWith('erc20_transfers_')
    );
    
    const ethFiles = files.filter(file => 
      file.includes(walletSuffix) && 
      file.endsWith('.csv') && 
      file.startsWith('eth_transactions_')
    );
    
    const csvFiles = [...erc20Files, ...ethFiles];

    console.log(`Found ${csvFiles.length} CSV files for wallet ${walletAddress}:`, csvFiles);

    const transactions: InsertTransaction[] = [];

    for (const csvFile of csvFiles) {
      const csvPath = path.join(process.cwd(), csvFile);
      console.log(`Processing CSV file: ${csvPath}`);
      
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Skip header
      console.log(`Found ${lines.length} lines in ${csvFile}`);

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split(',');
        
        // Handle ETH transactions vs ERC-20 token transfers differently
        if (csvFile.startsWith('eth_transactions_')) {
          // ETH transaction format: blockNumber,timeStamp,hash,nonce,blockHash,from,to,value,gas,gasPrice,gasUsed,isError,txreceipt_status
          if (columns.length < 13) continue;
          
          const [blockNumber, timeStamp, hash, nonce, blockHash, from, to, value, gas, gasPrice, gasUsed, isError, txreceipt_status] = columns;
          
          // Skip failed transactions
          if (isError === '1' || txreceipt_status === '0') continue;
          
          const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
          const amount = parseFloat(value) / Math.pow(10, 18); // ETH has 18 decimals
          
          transactions.push({
            walletId,
            hash,
            from,
            to,
            value,
            amount,
            tokenSymbol: 'ETH',
            timeStamp,
            blockNumber,
            transactionType,
            contractAddress: null, // ETH is native, no contract address
            tokenName: 'Ethereum',
            tokenDecimal: '18'
          });
          
        } else {
          // ERC-20 token transfer format
          if (columns.length < 19) continue;
          
          const [blockNumber, timeStamp, hash, nonce, blockHash, from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal, transactionIndex, gas, gasPrice, gasUsed, cumulativeGasUsed, input, confirmations] = columns;

          if (!hash || !timeStamp || !value) continue;

          // Check if transaction already exists
          const existingTx = await storage.getTransactionByHash(hash);
          if (existingTx) {
            console.log(`Transaction ${hash} already exists, skipping`);
            continue;
          }

          // Determine transaction type and amount
          const isIncoming = to.toLowerCase() === walletAddress.toLowerCase();
          const transactionType = isIncoming ? 'TO' : 'FROM';
          const decimals = parseInt(tokenDecimal) || 18;
          const amount = parseFloat(value) / Math.pow(10, decimals);

          console.log(`Adding transaction: ${hash} - ${tokenSymbol} ${amount} ${transactionType}`);

          transactions.push({
            walletId,
            hash,
            blockNumber,
            timeStamp,
            from,
            to,
            value,
            tokenName: tokenName || tokenSymbol,
            tokenSymbol,
            tokenDecimal,
            contractAddress,
            transactionType,
            amount
          });
        }
      }

      console.log(`Processed ${csvFile}, found ${transactions.length} new transactions so far`);
    }

    // Store transactions in database
    if (transactions.length > 0) {
      console.log(`Storing ${transactions.length} transactions in database...`);
      await storage.createTransactions(transactions);
      console.log(`Successfully stored ${transactions.length} transactions`);
    } else {
      console.log('No transactions to store');
    }
  }

  getImportProgress(importId: string): ImportProgress | undefined {
    return this.activeImports.get(importId);
  }

  getAllActiveImports(): ImportProgress[] {
    return Array.from(this.activeImports.values());
  }

  private updateProgress(importId: string, update: Partial<ImportProgress>): void {
    const current = this.activeImports.get(importId);
    if (current) {
      this.activeImports.set(importId, { ...current, ...update });
    }
  }

  clearCompletedImports(): void {
    for (const [id, progress] of this.activeImports.entries()) {
      if (progress.status === 'completed' || progress.status === 'error') {
        this.activeImports.delete(id);
      }
    }
  }
}

export const pythonExecutor = new PythonExecutor();
