import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importAllTokens() {
  console.log('Importing complete Ethereum ecosystem data...');
  
  try {
    const walletResult = await pool.query('SELECT id FROM wallets LIMIT 1');
    const walletId = walletResult.rows[0]?.id || 1;
    
    await pool.query('DELETE FROM transactions');
    console.log('Cleared existing transactions');
    
    const allTransactions = [];
    
    // Import ETH transactions (517 transactions)
    console.log('Processing ETH transactions...');
    const ethContent = fs.readFileSync('temp/eth_transactions_d337be.csv', 'utf-8');
    const ethLines = ethContent.split('\n').filter(line => line.trim());
    
    for (let i = 1; i < ethLines.length; i++) {
      const values = ethLines[i].split(',');
      if (values.length < 13) continue;
      
      const [blockNumber, timeStamp, hash, nonce, blockHash, from, to, value, gas, gasPrice, gasUsed, isError, txreceipt_status] = values;
      
      const walletAddress = '0xe11a3c6d20b464c77ca7dbe8cf9e83c91dd337be';
      const transactionType = from.toLowerCase() === walletAddress.toLowerCase() ? 'FROM' : 'TO';
      const amount = parseFloat(value) / Math.pow(10, 18); // ETH has 18 decimals
      
      allTransactions.push([
        walletId, hash, from, to, value, amount, 'ETH',
        timeStamp, blockNumber, transactionType, null, // No contract address for ETH
        'Ethereum', '18'
      ]);
    }
    
    console.log(`✓ ETH: ${ethLines.length - 1} transactions prepared`);
    
    // Import USDC transactions (592 transactions)
    console.log('Processing USDC transactions...');
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
    
    console.log(`✓ USDC: ${usdcLines.length - 1} transactions prepared`);
    
    // Import USDT transactions (205 transactions)
    console.log('Processing USDT transactions...');
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
    
    console.log(`✓ USDT: ${usdtLines.length - 1} transactions prepared`);
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
    
    // Final verification
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const tokenBreakdown = await pool.query('SELECT token_symbol, COUNT(*) as count FROM transactions GROUP BY token_symbol ORDER BY count DESC');
    
    console.log(`\n🎉 COMPLETE ETHEREUM ECOSYSTEM IMPORT SUCCESS!`);
    console.log(`✓ Total transactions: ${finalCount.rows[0].count}`);
    console.log(`✓ Expected: 517 ETH + 592 USDC + 205 USDT = 1,314`);
    
    console.log('\n📊 Token Breakdown:');
    tokenBreakdown.rows.forEach(row => {
      console.log(`  ${row.token_symbol}: ${row.count} transactions`);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importAllTokens();