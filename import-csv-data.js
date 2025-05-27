import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importCsvData() {
  console.log('Starting CSV import...');
  
  try {
    // Read and parse combined transfers CSV
    const csvContent = fs.readFileSync('combined_transfers_e11a3c.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    console.log(`Found ${lines.length - 1} transactions in CSV`);
    
    // First, get the wallet ID (assuming we have one wallet)
    const walletResult = await pool.query('SELECT id FROM wallets LIMIT 1');
    if (walletResult.rows.length === 0) {
      console.log('No wallet found, creating one...');
      const insertWallet = await pool.query(
        'INSERT INTO wallets (address, name, network, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
        ['0xe11a3c2d8d80b99b36a1e87e51ba4ee1b3a3b4c5', 'Imported Wallet', 'ethereum', true]
      );
      var walletId = insertWallet.rows[0].id;
    } else {
      var walletId = walletResult.rows[0].id;
    }
    
    console.log(`Using wallet ID: ${walletId}`);
    
    // Clear existing transactions to avoid duplicates
    await pool.query('DELETE FROM transactions');
    console.log('Cleared existing transactions');
    
    // Process each transaction
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 5) continue;
      
      const [time, token, action, address, amount] = values;
      
      // Convert time to Unix timestamp
      const date = new Date(time);
      const timestamp = Math.floor(date.getTime() / 1000).toString();
      
      // Generate a mock hash (since it's not in the simplified CSV)
      const hash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
      
      // Determine transaction type and from/to addresses
      const isOutgoing = action === 'FROM';
      const fromAddress = isOutgoing ? '0xe11a3c2d8d80b99b36a1e87e51ba4ee1b3a3b4c5' : address;
      const toAddress = isOutgoing ? address : '0xe11a3c2d8d80b99b36a1e87e51ba4ee1b3a3b4c5';
      
      const amountValue = parseFloat(amount) || 0;
      const valueInWei = (amountValue * Math.pow(10, 6)).toString(); // Convert to wei for USDC/USDT (6 decimals)
      
      await pool.query(`
        INSERT INTO transactions (
          wallet_id, hash, "from", "to", "value", amount, token_symbol, 
          time_stamp, block_number, transaction_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        walletId,
        hash,
        fromAddress,
        toAddress,
        valueInWei,
        amountValue,
        token,
        timestamp,
        '15000000', // Mock block number
        isOutgoing ? 'FROM' : 'TO'
      ]);
      
      if (i % 100 === 0) {
        console.log(`Imported ${i} transactions...`);
      }
    }
    
    console.log('CSV import completed successfully!');
    
    // Check final count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`Total transactions in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    await pool.end();
  }
}

importCsvData();