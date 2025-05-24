#!/bin/bash

# 🧮 Bonsol Calculator Quick Test Script
# This script tests each component step by step

set -e

echo "🧮 Starting Bonsol Calculator Quick Test..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}🔍 Step 1: Checking prerequisites...${NC}"

if ! command_exists cargo; then
    echo -e "${RED}❌ Rust/Cargo not found${NC}"
    exit 1
fi

if ! command_exists solana; then
    echo -e "${RED}❌ Solana CLI not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites found${NC}"
echo ""

echo -e "${BLUE}🏗️ Step 2: Building Solana program...${NC}"
cd solana-program
if cargo build-sbf; then
    echo -e "${GREEN}✅ Solana program built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Solana program${NC}"
    exit 1
fi
cd ..
echo ""

echo -e "${BLUE}🧪 Step 3: Building test client...${NC}"
cd test-client
if cargo build; then
    echo -e "${GREEN}✅ Test client built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build test client${NC}"
    exit 1
fi
cd ..
echo ""

echo -e "${BLUE}🌐 Step 4: Checking if Solana validator is running...${NC}"
if curl -s http://127.0.0.1:8899 > /dev/null; then
    echo -e "${GREEN}✅ Solana validator is running${NC}"
    VALIDATOR_RUNNING=true
else
    echo -e "${YELLOW}⚠️ Solana validator not running${NC}"
    VALIDATOR_RUNNING=false
fi
echo ""

echo -e "${BLUE}📋 Test Summary:${NC}"
echo -e "   ✅ Solana program: Built successfully"
echo -e "   ✅ Test client: Built successfully"
if [ "$VALIDATOR_RUNNING" = true ]; then
    echo -e "   ✅ Validator: Running"
else
    echo -e "   ⚠️ Validator: Not running"
fi
echo ""

echo -e "${BLUE}🎯 Next Steps:${NC}"

if [ "$VALIDATOR_RUNNING" = false ]; then
    echo -e "${YELLOW}Step A: Start the Solana validator${NC}"
    echo -e "   Run: ${YELLOW}solana-test-validator${NC}"
    echo ""
fi

echo -e "${YELLOW}Step B: Deploy the program${NC}"
echo -e "   Run: ${YELLOW}cd solana-program && solana program deploy target/deploy/bonsol_calculator_backend.so${NC}"
echo ""

echo -e "${YELLOW}Step C: Test with Rust client${NC}"
echo -e "   Run: ${YELLOW}cd test-client && cargo run${NC}"
echo ""

echo -e "${YELLOW}Step D: View the web interface${NC}"
echo -e "   Open: ${YELLOW}simple-frontend/index.html${NC} in your browser"
echo ""

echo -e "${GREEN}🎉 All components are ready for testing!${NC}"

if [ "$VALIDATOR_RUNNING" = true ]; then
    echo ""
    echo -e "${BLUE}💡 Quick Test Option:${NC}"
    echo -e "Would you like to run the Rust test client now? (y/n)"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        echo ""
        echo -e "${BLUE}🧪 Running test client...${NC}"
        cd test-client
        cargo run
    fi
fi 
