# 🧮 Bonsol Calculator - Zero-Knowledge Web App

A complete **zero-knowledge calculator** web application built with:
- **Frontend**: React/Next.js calculator interface  
- **Backend**: Solana program for calculation management
- **ZK Network**: Bonsol for zero-knowledge proof computation
- **Verification**: On-chain result storage and verification

## 🎯 What This Demonstrates

Transform your Bonsol calculator from a command-line tool into a full **production web application** that users can access from their browsers with wallet integration.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │───▶│  Calculator     │───▶│    Bonsol       │───▶│  ZK Calculator  │
│  (React App)    │    │  Solana Program │    │    Network      │    │    Program      │
│   + Wallet      │    │   (Backend)     │    │                 │    │ (Computation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       ▼                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
         └──────────────▶│   On-Chain      │◀───│   Execution     │◀───│   ZK Proof      │
                        │   History       │    │   Result        │    │   Result        │
                        │   Storage       │    │   Callback      │    │   (15 + 25 = 40)│
                        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Running the Application

**Step 1: Start the API Server**
```bash
cd calculator-api
npm install
npm start
```
The API server will start on `http://localhost:3001`

**Step 2: Start the Frontend (in a new terminal)**
```bash
cd frontend
npm install
npm start
```
The React app will start on `http://localhost:3000`

**Step 3: Use the Calculator**
1. Open your browser to `http://localhost:3000`
2. Enter two numbers and select an operation
3. Click "Calculate with ZK" 
4. Wait ~15-30 seconds for the zero-knowledge proof computation
5. See the verified result!

### Development Scripts

**Frontend:**
- `npm start` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm test` - Run tests

**API Server:**
- `npm start` - Start production server (port 3001)
- `npm run dev` - Start with nodemon for development

## 📁 What You Get

### 🌐 **Web Frontend** (`frontend/`)
- **Modern Calculator UI** - Clean, responsive design
- **Wallet Integration** - Phantom, Solflare wallet support  
- **Real-time Updates** - Watch calculations complete
- **History Tracking** - View all past calculations
- **Zero-Knowledge Badges** - Show proof verification

### ⚙️ **Solana Program Backend** (`solana-program/`)
- **State Management** - Store user calculations on-chain
- **Bonsol Integration** - Submit ZK execution requests
- **Callback Handling** - Receive and store ZK results
- **Access Control** - User-specific calculation history

### 📚 **TypeScript Client Library** (`frontend/calculator-client.ts`)
- **Easy Integration** - Simple API for frontend developers
- **Type Safety** - Full TypeScript support
- **Wallet Abstraction** - Handle Solana transactions seamlessly
- **Real-time Polling** - Watch for calculation completion

## 🎮 User Experience

### For End Users:
1. **Visit your calculator website**
2. **Connect Solana wallet** (Phantom, Solflare, etc.)
3. **Enter calculation**: e.g., 123 × 456
4. **Click "Calculate with ZK"**
5. **Wait ~10-30 seconds** for zero-knowledge proof
6. **See verified result**: 56,088 ✅ *Verified by Zero-Knowledge Proof*
7. **View calculation history** and share verifiable results

### For Developers:
```typescript
// Initialize calculator backend
await calculatorClient.initialize(wallet);

// Submit calculation 
await calculatorClient.submitCalculation(
  wallet, 
  CalculatorOperation.MULTIPLY, 
  123, 
  456
);

// Watch for results
calculatorClient.watchCalculation(wallet.publicKey, (state) => {
  if (state.lastCalculation?.isComplete) {
    console.log('Result:', state.lastCalculation.result);
  }
});
```

## 📦 Components Included

### 1. **Enhanced Solana Program** (`solana-program/src/lib.rs`)
- ✅ **Calculator State Management** - Track calculations per user
- ✅ **Bonsol Integration** - Submit ZK execution requests  
- ✅ **Callback Processing** - Handle ZK computation results
- ✅ **History Storage** - On-chain calculation records
- ✅ **Access Control** - User-specific state management

### 2. **Frontend Web App** (`frontend/`)
- ✅ **React Calculator Component** - Modern UI with operation selection
- ✅ **Wallet Integration** - Connect Phantom, Solflare, etc.
- ✅ **Real-time Status** - Show calculation progress
- ✅ **Results Display** - Show ZK-verified results with proof badges
- ✅ **History Interface** - View past calculations
- ✅ **Responsive Design** - Works on desktop and mobile

### 3. **TypeScript Client Library** (`frontend/calculator-client.ts`)
- ✅ **Simple API** - Easy integration for developers
- ✅ **Type Safety** - Full TypeScript definitions
- ✅ **Transaction Handling** - Abstract Solana complexity
- ✅ **State Polling** - Watch for calculation updates
- ✅ **Error Handling** - Robust error management

### 4. **Automated Deployment** (`deploy.sh`)
- ✅ **One-Command Deploy** - Build and deploy everything
- ✅ **Network Support** - Devnet, testnet, mainnet
- ✅ **Dependency Checking** - Verify prerequisites
- ✅ **Configuration Management** - Update program IDs automatically

## 🎨 Customization Examples

### Add New Operations
```rust
// In solana-program/src/lib.rs
const OP_POWER: i64 = 4;
const OP_SQRT: i64 = 5;
const OP_FACTORIAL: i64 = 6;

// Handle in submit_calculation function
match operation {
    OP_POWER => { /* handle power operation */ }
    OP_SQRT => { /* handle square root */ }
    // ...
}
```

### Enhanced Frontend Features
```typescript
// Add dark mode
const [isDarkMode, setIsDarkMode] = useState(false);

// Add batch calculations
const submitBatchCalculations = async (calculations: Calculation[]) => {
  // Submit multiple calculations at once
};

// Add export functionality
const exportHistory = () => {
  // Export calculation history as CSV/JSON
};
```

### Custom Styling
```css
/* Add to styles/globals.css */
.calculator-dark {
  background: #1a1a1a;
  color: #ffffff;
}

.zk-badge {
  background: linear-gradient(45deg, #007bff, #28a745);
  animation: pulse 2s infinite;
}
```

## 🌟 Advanced Use Cases

### 1. **Financial Calculator dApp**
- Private income calculations
- Portfolio performance (without revealing holdings)
- Tax calculations with privacy

### 2. **Educational Platform**
- Students submit homework calculations
- Zero-knowledge proof of correct solutions
- No cheating possible

### 3. **Scientific Computing**
- Verify research calculations
- Collaborative computation with privacy
- Reproducible results with proofs

### 4. **Business Applications**
- Private financial modeling
- Competitive analysis calculations
- Verified metrics without revealing data

## 📊 Performance & Costs

### Calculation Times:
- **Simple operations** (add, subtract): ~10-15 seconds
- **Complex operations** (multiply, divide): ~15-30 seconds  
- **Network dependent**: Bonsol network load affects timing

### Transaction Costs:
- **Devnet**: Free (airdrops available)
- **Mainnet**: ~0.001-0.01 SOL per calculation (~$0.01-0.10)
- **Bonsol fees**: Additional ZK proof costs

### Scalability:
- **Concurrent users**: Supports multiple simultaneous calculations
- **History storage**: On-chain storage grows with usage
- **Optimizations**: Batch operations, state compression possible

## 🔒 Security Considerations

### Smart Contract Security:
- ✅ **Input validation** on all parameters
- ✅ **Access control** per user calculations  
- ✅ **Reentrancy protection** in state updates
- ✅ **Overflow protection** in arithmetic

### Frontend Security:
- ✅ **Wallet integration** through established adapters
- ✅ **Input sanitization** before blockchain submission
- ✅ **Network validation** (devnet vs mainnet)
- ✅ **Error boundary** handling

### Privacy Features:
- ✅ **Zero-knowledge proofs** hide computation process
- ✅ **On-chain encryption** of sensitive data (optional)
- ✅ **Selective disclosure** of calculation results
- ✅ **Verifiable results** without revealing inputs

## 🚢 Production Deployment

### Frontend Hosting Options:
```bash
# Vercel (recommended)
npm install -g vercel
vercel --prod

# Netlify
npm run build && netlify deploy

# AWS/GCP/Azure
npm run build && upload dist/
```

### Mainnet Deployment:
```bash
# Deploy to mainnet
NETWORK=mainnet ./deploy.sh

# Verify deployment
solana program show <PROGRAM_ID> --url mainnet-beta
```

### Domain & SSL:
- Point your domain to the hosting platform
- SSL automatically handled by Vercel/Netlify
- Custom domain configuration in platform settings

## 📚 Full Documentation

- 📖 **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step instructions
- 🏃 **[Quick Start](#quick-start)** - Deploy in 5 minutes  
- 🛠️ **[Development Guide](client/README.md)** - Build and customize
- 🔧 **[API Reference](frontend/calculator-client.ts)** - TypeScript client docs

## 💡 Why This Is Powerful

### For Users:
- **🔒 Privacy**: Calculations verified without revealing process
- **✅ Trust**: Cryptographic proof of correctness
- **🌐 Accessibility**: No downloads, works in any browser
- **💰 Low Cost**: Minimal blockchain fees

### For Developers:
- **🧩 Modular**: Separate frontend, backend, ZK components
- **🔌 Extensible**: Easy to add new operations and features  
- **📱 Modern**: React/TypeScript with wallet integration
- **🚀 Scalable**: Solana's high throughput and low costs

### For Businesses:
- **🎯 Competitive**: First-mover advantage in ZK applications
- **📈 Monetizable**: Transaction fees, premium features
- **🏢 White-label**: Rebrand for specific industries
- **🔗 Integrable**: API for other applications

## 🎉 Get Started

```bash
# Clone and deploy
git clone <your-repo>
cd bonsol-calculator
./deploy.sh

# Start building your ZK-powered calculator empire! 🚀
```

---

**🧮 Transform simple calculations into verifiable, private, decentralized computations with zero-knowledge proofs!**
