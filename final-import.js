import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function finalImport() {
  console.log('Importing ALL authentic blockchain transaction data...');
  
  try {
    // Get wallet ID
    const walletResult = await pool.query('SELECT id FROM wallets LIMIT 1');
    const walletId = walletResult.rows[0]?.id || 1;
    
    // Clear existing transactions
    await pool.query('DELETE FROM transactions');
    console.log('Cleared existing transactions for complete import');
    
    let totalImported = 0;
    const processedHashes = new Set();
    
    // Import USDC transactions
    console.log('Processing USDC transactions...');
    const usdcContent = fs.readFileSync('erc20_transfers_USDC_e11a3c.csv', 'utf-8');
    const usdcLines = usdcContent.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < usdcLines.length; i++) {
      const values = usdcLines[i].split(',');
      if (values.length < 19) continue;
      
      const [blockNumber, timeStamp, hash, nonce, blockHash, from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal] = values;
      
      // Skip if hash already processed
      if (processedHashes.has(hash)) continue;
      processedHashes.add(hash);
      
      const walletAddress = '0xe11a3c6d20b464c77ca7dbe8cf9e83c91dd337be';
      const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
      const amount = parseFloat(value) / Math.pow(10, parseInt(tokenDecimal) || 6);
      
      try {
        await pool.query(`
          INSERT INTO transactions (
            wallet_id, hash, "from", "to", "value", amount, token_symbol, 
            time_stamp, block_number, transaction_type, contract_address, 
            token_name, token_decimal, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        `, [
          walletId, hash, from, to, value, amount, tokenSymbol,
          timeStamp, blockNumber, transactionType, contractAddress,
          tokenName, tokenDecimal
        ]);
        
        totalImported++;
        if (totalImported % 100 === 0) {
          console.log(`Imported ${totalImported} transactions...`);
        }
      } catch (error) {
        if (!error.message.includes('duplicate key')) {
          console.error(`Error importing transaction ${hash}:`, error.message);
        }
      }
    }
    
    console.log(`Completed USDC: processed ${usdcLines.length - 1} lines`);
    
    // Import USDT transactions
    console.log('Processing USDT transactions...');
    const usdtContent = fs.readFileSync('erc20_transfers_USDT_e11a3c.csv', 'utf-8');
    const usdtLines = usdtContent.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < usdtLines.length; i++) {
      const values = usdtLines[i].split(',');
      if (values.length < 19) continue;
      
      const [blockNumber, timeStamp, hash, nonce, blockHash, from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal] = values;
      
      // Skip if hash already processed
      if (processedHashes.has(hash)) continue;
      processedHashes.add(hash);
      
      const walletAddress = '0xe11a3c6d20b464c77ca7dbe8cf9e83c91dd337be';
      const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
      const amount = parseFloat(value) / Math.pow(10, parseInt(tokenDecimal) || 6);
      
      try {
        await pool.query(`
          INSERT INTO transactions (
            wallet_id, hash, "from", "to", "value", amount, token_symbol, 
            time_stamp, block_number, transaction_type, contract_address, 
            token_name, token_decimal, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        `, [
          walletId, hash, from, to, value, amount, tokenSymbol,
          timeStamp, blockNumber, transactionType, contractAddress,
          tokenName, tokenDecimal
        ]);
        
        totalImported++;
        if (totalImported % 100 === 0) {
          console.log(`Imported ${totalImported} transactions...`);
        }
      } catch (error) {
        if (!error.message.includes('duplicate key')) {
          console.error(`Error importing transaction ${hash}:`, error.message);
        }
      }
    }
    
    console.log(`Completed USDT: processed ${usdtLines.length - 1} lines`);
    
    // Final verification
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const newestTransaction = await pool.query('SELECT time_stamp, token_symbol, amount FROM transactions ORDER BY CAST(time_stamp AS INTEGER) DESC LIMIT 1');
    const oldestTransaction = await pool.query('SELECT time_stamp, token_symbol, amount FROM transactions ORDER BY CAST(time_stamp AS INTEGER) ASC LIMIT 1');
    
    console.log(`\n✓ SUCCESS: ${finalCount.rows[0].count} authentic blockchain transactions imported!`);
    console.log(`✓ Newest transaction: ${new Date(parseInt(newestTransaction.rows[0].time_stamp) * 1000).toLocaleString()}`);
    console.log(`✓ Oldest transaction: ${new Date(parseInt(oldestTransaction.rows[0].time_stamp) * 1000).toLocaleString()}`);
    console.log(`✓ All data sourced from real Ethereum blockchain via Etherscan API`);
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

finalImport();