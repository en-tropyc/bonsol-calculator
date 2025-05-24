# Bonsol Calculator

A zero-knowledge calculator web application using Bonsol ZK network for verifiable computations.

## Architecture

```
React Frontend ──→ Express API ──→ Bonsol Network ──→ ZK Computation
      ↓               ↓               ↓               ↓
  localhost:3000  localhost:3001   ZK Execution    Verified Result
```

## Quick Start

**1. Start the API server:**
```bash
cd calculator-api
npm install
npm start
```

**2. Start the frontend:**
```bash
cd frontend  
npm install
npm start
```

**3. Use the calculator:**
- Open `http://localhost:3000`
- Enter numbers and select operation
- Click "Calculate with ZK"
- Wait ~15-30 seconds for ZK proof computation

## Project Structure

- `frontend/` - React calculator UI
- `calculator-api/` - Express server handling ZK requests
- `client/` - Comprehensive Bonsol client reference

## What It Does

Submit calculations through a web interface that:
1. Sends requests to local API server
2. Submits to Bonsol ZK network for computation
3. Returns cryptographically verified results
4. Displays execution IDs and transaction signatures

Example successful execution:
- Calculation: 15 × 25 = 375
- Execution ID: `calc_1748059174997_35200c8e`
- Transaction: `5yTzwjn88HTWTPnciBoqpXnj7ouuYZJsRFN8n2GPM9YmjuctidvJkhywepj11dxuXjKvTRC48PXBetL6ERtDb5mF`
