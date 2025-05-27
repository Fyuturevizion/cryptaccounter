import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importAllTransactions() {
  console.log('Importing all transaction events...');
  
  try {
    const walletResult = await pool.query('SELECT id FROM wallets LIMIT 1');
    const walletId = walletResult.rows[0]?.id || 1;
    
    await pool.query('DELETE FROM transactions');
    console.log('Cleared existing transactions');
    
    let total = 0;
    
    // Import all CSV files in one go
    const files = ['erc20_transfers_USDC_e11a3c.csv', 'erc20_transfers_USDT_e11a3c.csv'];
    
    for (const fileName of files) {
      console.log(`Processing ${fileName}...`);
      const content = fs.readFileSync(fileName, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 13) continue;
        
        const [blockNumber, timeStamp, hash, , , from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal] = values;
        
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
          
          total++;
          if (total % 100 === 0) console.log(`Imported ${total}...`);
          
        } catch (error) {
          // Skip duplicates but continue
          if (!error.message.includes('duplicate')) {
            console.error(`Error on transaction ${total + 1}:`, error.message);
          }
        }
      }
      
      console.log(`Completed ${fileName}: ${lines.length - 1} lines processed`);
    }
    
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`✓ Total imported: ${finalCount.rows[0].count} transaction events`);
    
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    await pool.end();
  }
}

importAllTransactions();