import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function batchImportAll() {
  console.log('Batch importing ALL 797 authentic blockchain transactions...');
  
  try {
    const walletResult = await pool.query('SELECT id FROM wallets LIMIT 1');
    const walletId = walletResult.rows[0]?.id || 1;
    
    // Clear for fresh complete import
    await pool.query('DELETE FROM transactions');
    
    const allTransactions = [];
    
    // Process USDC file (592 transactions)
    console.log('Reading USDC transactions...');
    const usdcContent = fs.readFileSync('temp/erc20_transfers_USDC_e11a3c.csv', 'utf-8');
    const usdcLines = usdcContent.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < usdcLines.length; i++) {
      const values = usdcLines[i].split(',');
      if (values.length < 13) continue;
      
      const [blockNumber, timeStamp, hash, , , from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal] = values;
      
      const walletAddress = '0xe11a3c6d20b464c77ca7dbe8cf9e83c91dd337be';
      const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
      const amount = parseFloat(value) / Math.pow(10, parseInt(tokenDecimal) || 6);
      
      allTransactions.push([
        walletId, hash, from, to, value, amount, tokenSymbol,
        timeStamp, blockNumber, transactionType, contractAddress,
        tokenName, tokenDecimal
      ]);
    }
    
    console.log(`Prepared ${allTransactions.length} USDC transactions`);
    
    // Process USDT file (205 transactions)
    console.log('Reading USDT transactions...');
    const usdtContent = fs.readFileSync('temp/erc20_transfers_USDT_e11a3c.csv', 'utf-8');
    const usdtLines = usdtContent.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < usdtLines.length; i++) {
      const values = usdtLines[i].split(',');
      if (values.length < 13) continue;
      
      const [blockNumber, timeStamp, hash, , , from, contractAddress, to, value, tokenName, tokenSymbol, tokenDecimal] = values;
      
      const walletAddress = '0xe11a3c6d20b464c77ca7dbe8cf9e83c91dd337be';
      const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
      const amount = parseFloat(value) / Math.pow(10, parseInt(tokenDecimal) || 6);
      
      allTransactions.push([
        walletId, hash, from, to, value, amount, tokenSymbol,
        timeStamp, blockNumber, transactionType, contractAddress,
        tokenName, tokenDecimal
      ]);
    }
    
    console.log(`Total prepared: ${allTransactions.length} transactions`);
    
    // Batch insert all transactions
    console.log('Performing batch insert...');
    for (let i = 0; i < allTransactions.length; i += 50) {
      const batch = allTransactions.slice(i, i + 50);
      
      const values = batch.map((_, idx) => 
        `($${idx * 13 + 1}, $${idx * 13 + 2}, $${idx * 13 + 3}, $${idx * 13 + 4}, $${idx * 13 + 5}, $${idx * 13 + 6}, $${idx * 13 + 7}, $${idx * 13 + 8}, $${idx * 13 + 9}, $${idx * 13 + 10}, $${idx * 13 + 11}, $${idx * 13 + 12}, $${idx * 13 + 13})`
      ).join(', ');
      
      const params = batch.flat();
      
      await pool.query(`
        INSERT INTO transactions (
          wallet_id, hash, "from", "to", "value", amount, token_symbol, 
          time_stamp, block_number, transaction_type, contract_address, 
          token_name, token_decimal
        ) VALUES ${values}
      `, params);
      
      console.log(`Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(allTransactions.length/50)}`);
    }
    
    // Verify complete import
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const tokenBreakdown = await pool.query('SELECT token_symbol, COUNT(*) as count FROM transactions GROUP BY token_symbol');
    
    console.log(`\n✅ SUCCESS: ${finalCount.rows[0].count} transactions imported!`);
    console.log('Token breakdown:');
    tokenBreakdown.rows.forEach(row => {
      console.log(`  ${row.token_symbol}: ${row.count} transactions`);
    });
    
    if (finalCount.rows[0].count >= 797) {
      console.log('🎉 ALL AUTHENTIC BLOCKCHAIN DATA SUCCESSFULLY IMPORTED!');
    } else {
      console.log('⚠️ WARNING: Some transactions may be missing');
    }
    
  } catch (error) {
    console.error('Batch import failed:', error);
  } finally {
    await pool.end();
  }
}

batchImportAll();