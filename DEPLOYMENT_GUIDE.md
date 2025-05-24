# 🚀 Bonsol Calculator Web App Deployment Guide

This guide walks you through deploying a **Zero-Knowledge Calculator** as a web application with a Solana program backend using the Bonsol network.

## 📋 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React/Next.js │───▶│  Calculator     │───▶│    Bonsol       │───▶│  ZK Calculator  │
│   Frontend      │    │  Solana Program │    │    Network      │    │    Program      │
│   (User Input)  │    │   (Backend)     │    │                 │    │ (Computation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       ▼                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         └──────────────▶│   Store         │◀───│   Execution     │◀───│   ZK Proof      │
                        │   Results       │    │   Result        │    │   Result        │
                        │   On-Chain      │    │   Callback      │    │   (2 + 3 = 5)   │
                        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Components

1. **Frontend Web App** - React/Next.js calculator interface
2. **Solana Program Backend** - Rust program that manages calculations
3. **Bonsol Integration** - Submits ZK execution requests
4. **Calculator ZK Program** - Performs the actual computation with zero-knowledge proofs

## 📦 Prerequisites

- **Rust** (latest stable)
- **Node.js** (v18+) 
- **Solana CLI** tools
- **Anchor Framework** (optional, for easier deployment)

## 🏗️ Step-by-Step Deployment

### 1. Deploy the Solana Program Backend

#### Build the Program
```bash
cd solana-program
cargo build-bpf
```

#### Deploy to Devnet
```bash
# Deploy the program
solana program deploy target/deploy/bonsol_calculator_backend.so \
  --url devnet \
  --keypair ~/.config/solana/id.json

# Note the Program ID that gets printed
# Update CALCULATOR_PROGRAM_ID in your frontend code
```

#### Get Program ID
```bash
solana-keygen pubkey target/deploy/bonsol_calculator_backend-keypair.json
```

### 2. Set Up the Frontend

#### Create Next.js Project
```bash
mkdir calculator-frontend
cd calculator-frontend
npm init -y
npm install next react react-dom @types/node @types/react typescript
```

#### Install Solana Dependencies
```bash
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets borsh
```

#### Copy the Client Files
Copy the `calculator-client.ts` and `CalculatorApp.tsx` files to your project:
```bash
# Copy the TypeScript client library
cp ../frontend/calculator-client.ts ./lib/
cp ../frontend/CalculatorApp.tsx ./components/
```

#### Create the Main Page
Create `pages/index.tsx`:
```typescript
import CalculatorApp from '../components/CalculatorApp';

export default function Home() {
  return <CalculatorApp />;
}
```

#### Update Program ID
In `calculator-client.ts`, update the `CALCULATOR_PROGRAM_ID` with your deployed program's ID:
```typescript
export const CALCULATOR_PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
```

### 3. Configure Wallet Integration (Production)

For production, integrate with Solana wallet adapters:

#### Update `pages/_app.tsx`
```typescript
import type { AppProps } from 'next/app';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

export default function App({ Component, pageProps }: AppProps) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your calculator!

## 🎯 Usage Flow

### For Users:
1. **Connect Wallet** - Users connect their Solana wallet (Phantom, Solflare, etc.)
2. **Input Calculation** - Enter two numbers and select operation (add, subtract, multiply, divide)
3. **Submit to ZK Network** - Click "Calculate with ZK" to submit to Bonsol
4. **Wait for Proof** - Zero-knowledge proof is computed by the Bonsol network
5. **View Result** - Verified result appears with proof confirmation

### For Developers:
1. **Initialize Backend** - `calculatorClient.initialize(wallet)`
2. **Submit Calculations** - `calculatorClient.submitCalculation(wallet, operation, a, b)`
3. **Watch for Results** - `calculatorClient.watchCalculation(wallet.publicKey, onUpdate)`
4. **Display History** - `calculatorClient.getHistory(wallet.publicKey)`

## 🔧 Configuration Options

### Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_CALCULATOR_PROGRAM_ID=YOUR_PROGRAM_ID
```

### Solana Program Configuration
In `solana-program/src/lib.rs`, you can modify:
- **Calculator operations** (add more math functions)
- **Callback handling** (custom result processing)
- **State management** (store calculation history)
- **Access control** (restrict who can use the calculator)

## 🚢 Production Deployment

### Deploy Frontend

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

#### Self-hosted
```bash
npm run build
npm start
```

### Deploy Program to Mainnet
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy program
solana program deploy target/deploy/bonsol_calculator_backend.so \
  --keypair ~/.config/solana/id.json

# Update frontend with mainnet program ID
```

## 💡 Features & Benefits

### For Users
- **🔒 Privacy** - Calculations verified without revealing computation steps
- **✅ Verifiable** - Results are cryptographically proven correct
- **🌐 Decentralized** - No central server, runs on Solana blockchain
- **💰 Low Cost** - Minimal transaction fees on Solana

### For Developers  
- **🧩 Modular** - Separate frontend, backend, and ZK components
- **🔌 Extensible** - Easy to add new mathematical operations
- **📱 Responsive** - Works on desktop and mobile
- **🔍 Transparent** - Open source and auditable

## 🎨 Customization Ideas

### Add More Operations
```rust
// In solana-program/src/lib.rs
const OP_POWER: i64 = 4;
const OP_SQRT: i64 = 5;
const OP_FACTORIAL: i64 = 6;
```

### Enhanced UI
- Dark/light mode toggle
- Calculator history export
- Real-time calculation status
- Transaction explorer links
- Multiple wallet support

### Advanced Features
- **Batch calculations** - Submit multiple operations at once
- **Private inputs** - Support for confidential operands
- **Custom callbacks** - Trigger actions when calculations complete
- **Analytics dashboard** - Track usage and performance
- **API integration** - REST API for external applications

## 📊 Example User Journey

1. **Sarah visits your calculator website**
2. **Connects her Phantom wallet**
3. **Wants to calculate: 1,234 × 5,678**
4. **Enters the numbers, clicks "Calculate with ZK"**
5. **Bonsol network computes the ZK proof (takes ~10-30 seconds)**
6. **Result appears: 7,006,652 ✅ Verified by Zero-Knowledge Proof**
7. **Sarah can see her calculation history and share the verifiable result**

## 🔐 Security Considerations

- **Wallet Security** - Use hardware wallets for mainnet
- **Program Auditing** - Audit Rust code before mainnet deployment
- **RPC Security** - Use trusted RPC endpoints
- **Input Validation** - Validate all user inputs
- **Rate Limiting** - Prevent spam calculations

## 🆘 Troubleshooting

### Common Issues

**Program deployment fails**
```bash
# Check balance
solana balance
# Request airdrop if on devnet
solana airdrop 2
```

**Frontend can't connect to program**
- Verify program ID is correct
- Check network configuration (devnet vs mainnet)
- Ensure wallet has SOL for transactions

**Calculations timeout**
- Bonsol network may be busy
- Increase timeout in `watchCalculation()`
- Check Bonsol network status

**Build errors**
```bash
# Update dependencies
cargo update
npm update
```

## 📚 Resources

- [Bonsol Documentation](https://docs.bonsol.xyz)
- [Solana Program Development](https://docs.solana.com/developing/programs)
- [React Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Zero-Knowledge Proofs Explained](https://blog.ethereum.org/2016/12/05/zksnarks-in-a-nutshell/)

## 🎉 Next Steps

1. **Deploy your calculator** following this guide
2. **Add custom operations** for your specific use case
3. **Integrate with other dApps** using the client library
4. **Share your calculator** with the Solana community!

---

**🧮 Happy calculating with zero-knowledge proofs!** 

For questions or support, open an issue in the repository. 
