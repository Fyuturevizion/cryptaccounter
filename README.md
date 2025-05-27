# CryptoLedger - Treasury Accounting System

A professional cryptocurrency treasury accounting web application designed to provide comprehensive transaction tracking, analysis, and reporting capabilities for crypto financial management.

![CryptoLedger Dashboard](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=CryptoLedger+Dashboard)

## ✨ Features

### 📊 Dashboard Analytics
- **Real-time Balance Tracking**: Monitor total portfolio value across multiple wallets
- **Active Wallet Management**: Track Ethereum and Base network wallets
- **Transaction Analytics**: Comprehensive transaction history and analysis
- **P&L Reporting**: Monthly profit/loss calculations with percentage changes

### 🔗 Blockchain Integration
- **Multi-Network Support**: Ethereum and Base network compatibility
- **Native ETH Tracking**: Handles native Ethereum transactions
- **ERC-20 Token Support**: USDC, USDT, and other standard tokens
- **Real-time Data**: Direct integration with Etherscan API

### 💼 Wallet Management
- **Bulk Import**: Import transaction history from multiple wallets
- **Custom Naming**: Assign meaningful names to wallet addresses
- **Network Detection**: Automatic network identification
- **Balance Calculation**: Accurate portfolio valuation

### 📈 Transaction Processing
- **Comprehensive History**: Complete transaction records with metadata
- **Type Classification**: Incoming/outgoing transaction categorization
- **Token Recognition**: Automatic token symbol and contract detection
- **Export Capabilities**: CSV export functionality

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Wouter** for lightweight routing
- **TanStack Query** for server state management
- **Tailwind CSS** for styling
- **Shadcn/ui** for beautiful components

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **Python** integration for blockchain data processing

### Infrastructure
- **Serverless architecture** ready
- **RESTful API** design
- **Real-time progress tracking**
- **Error handling and validation**

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cryptoledger-treasury.git
   cd cryptoledger-treasury
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your environment variables:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Database Setup
The application uses PostgreSQL with Drizzle ORM. The schema includes:
- **Wallets**: Store wallet addresses and metadata
- **Transactions**: Complete transaction history
- **API Keys**: Manage external service credentials

### API Keys Required
- **Etherscan API Key**: For Ethereum transaction data
- **Base API Key**: For Base network transactions (if using Base)

## 📱 Usage

### Adding a Wallet
1. Navigate to the Dashboard
2. Use the "Import Wallet Data" section
3. Enter wallet address and optional name
4. Select network (Ethereum/Base)
5. Choose tokens to track (ETH, USDC, USDT)
6. Set block range for historical data
7. Click "Import Data"

### Viewing Analytics
- **Total Balance**: See your complete portfolio value
- **Active Wallets**: Monitor all connected wallets
- **Transaction Count**: Track transaction volume
- **P&L Tracking**: Monitor monthly performance

### Exporting Data
- Export transactions to CSV format
- Filter by wallet, token, or date range
- Download comprehensive reports

## 🏗️ Project Structure

```
cryptoledger-treasury/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   └── python-executor.ts # Blockchain data processing
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema
└── attached_assets/       # Python scripts for data fetching
```

## 🔐 Security Features

- **Input Validation**: Comprehensive data validation using Zod schemas
- **Address Verification**: Ethereum address format validation
- **API Rate Limiting**: Respect external API limits
- **Error Handling**: Robust error management and logging

## 🎨 UI/UX Features

- **Professional Design**: Clean, modern interface inspired by leading fintech apps
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Real-time Updates**: Live progress tracking for imports
- **Intuitive Navigation**: Clear sidebar navigation with organized sections
- **Copy-to-Clipboard**: Easy address and hash copying
- **Loading States**: Smooth loading animations and skeleton screens

## 📊 Supported Networks & Tokens

### Ethereum Mainnet
- **ETH** (Native)
- **USDC** (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
- **USDT** (0xdAC17F958D2ee523a2206206994597C13D831ec7)

### Base Network
- **ETH** (Native)
- **USDC** (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **USDT** (0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Etherscan** for providing reliable blockchain data APIs
- **Shadcn/ui** for beautiful, accessible UI components
- **TanStack Query** for excellent server state management
- **Drizzle ORM** for type-safe database operations

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/cryptoledger-treasury/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

---

**Built with ❤️ for the crypto community**