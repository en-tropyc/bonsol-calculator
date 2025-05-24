#!/bin/bash

# 🚀 Bonsol Calculator Deployment Script
# This script automates the deployment of the calculator web app

set -e

echo "🧮 Starting Bonsol Calculator Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="${NETWORK:-devnet}"
FRONTEND_DIR="calculator-frontend"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Network: ${NETWORK}"
echo -e "   Frontend Directory: ${FRONTEND_DIR}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists cargo; then
    echo -e "${RED}❌ Rust/Cargo not found. Please install from https://rustup.rs/${NC}"
    exit 1
fi

if ! command_exists solana; then
    echo -e "${RED}❌ Solana CLI not found. Please install from https://docs.solana.com/cli/install-solana-cli-tools${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Please install from https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Set Solana network
echo -e "${BLUE}🌐 Configuring Solana for ${NETWORK}...${NC}"
if [ "$NETWORK" = "mainnet" ]; then
    solana config set --url mainnet-beta
elif [ "$NETWORK" = "devnet" ]; then
    solana config set --url devnet
else
    solana config set --url testnet
fi

# Check balance
BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
if [ "$BALANCE" -lt 1000000000 ]; then # Less than 1 SOL
    echo -e "${YELLOW}⚠️ Low SOL balance: $(solana balance)${NC}"
    if [ "$NETWORK" = "devnet" ]; then
        echo -e "${BLUE}💰 Requesting airdrop...${NC}"
        solana airdrop 2 || echo -e "${YELLOW}⚠️ Airdrop failed, continuing anyway...${NC}"
    else
        echo -e "${YELLOW}⚠️ Please fund your wallet for ${NETWORK}${NC}"
    fi
fi

# Build and deploy Solana program
echo -e "${BLUE}🏗️ Building Solana program...${NC}"
cd solana-program

# Clean and build
cargo clean
cargo build-bpf

if [ ! -f "target/deploy/bonsol_calculator_backend.so" ]; then
    echo -e "${RED}❌ Program build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Program built successfully${NC}"

# Deploy program
echo -e "${BLUE}🚀 Deploying program to ${NETWORK}...${NC}"
PROGRAM_ID=$(solana program deploy target/deploy/bonsol_calculator_backend.so --output json-compact | jq -r '.programId')

if [ "$PROGRAM_ID" = "null" ] || [ -z "$PROGRAM_ID" ]; then
    echo -e "${RED}❌ Program deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Program deployed successfully!${NC}"
echo -e "   Program ID: ${PROGRAM_ID}"

cd ..

# Set up frontend
echo -e "${BLUE}🌐 Setting up frontend...${NC}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${BLUE}📁 Creating frontend directory...${NC}"
    mkdir -p "$FRONTEND_DIR"
    cd "$FRONTEND_DIR"
    
    # Initialize package.json
    npm init -y
    
    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install next react react-dom @types/node @types/react @types/react-dom typescript
    npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets borsh
    
    # Create directory structure
    mkdir -p pages components lib styles
    
    # Copy frontend files
    cp ../frontend/package.json ./package.json
    cp ../frontend/calculator-client.ts ./lib/
    cp ../frontend/CalculatorApp.tsx ./components/
    
    # Create index page
    cat > pages/index.tsx << EOF
import CalculatorApp from '../components/CalculatorApp';

export default function Home() {
  return <CalculatorApp />;
}
EOF

    # Create _app.tsx with wallet integration
    cat > pages/_app.tsx << EOF
import type { AppProps } from 'next/app';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function App({ Component, pageProps }: AppProps) {
  const network = WalletAdapterNetwork.${NETWORK === "mainnet" ? "Mainnet" : "Devnet"};
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
EOF

    # Create next.config.js
    cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
EOF

    # Create tsconfig.json
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF
    
    cd ..
fi

# Update program ID in frontend
echo -e "${BLUE}🔧 Updating program ID in frontend...${NC}"
cd "$FRONTEND_DIR"

# Update calculator-client.ts with the deployed program ID
sed -i.bak "s/2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6/${PROGRAM_ID}/g" lib/calculator-client.ts
rm lib/calculator-client.ts.bak 2>/dev/null || true

echo -e "${GREEN}✅ Frontend configured successfully${NC}"

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_SOLANA_NETWORK=${NETWORK}
NEXT_PUBLIC_RPC_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
NEXT_PUBLIC_CALCULATOR_PROGRAM_ID=${PROGRAM_ID}
EOF

# Build frontend
echo -e "${BLUE}🏗️ Building frontend...${NC}"
npm run build

echo -e "${GREEN}✅ Frontend built successfully${NC}"

cd ..

# Final summary
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   🌐 Network: ${NETWORK}"
echo -e "   📦 Program ID: ${PROGRAM_ID}"
echo -e "   📁 Frontend: ${FRONTEND_DIR}/"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "   1. Start development server: ${YELLOW}cd ${FRONTEND_DIR} && npm run dev${NC}"
echo -e "   2. Open browser: ${YELLOW}http://localhost:3000${NC}"
echo -e "   3. Deploy to production: ${YELLOW}vercel --prod${NC} (or your preferred platform)"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo -e "   📖 Deployment Guide: ${YELLOW}DEPLOYMENT_GUIDE.md${NC}"
echo -e "   🔍 Explorer: ${YELLOW}https://explorer.solana.com/address/${PROGRAM_ID}?cluster=${NETWORK}${NC}"
echo ""
echo -e "${GREEN}🧮 Happy calculating with zero-knowledge proofs!${NC}" 
