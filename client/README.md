# Bonsol Calculator Client

A Rust client for creating calculator execution requests on the Bonsol network, demonstrating two different approaches:

1. **Example Program Method** - Creates execution requests through the example Bonsol program
2. **Direct Bonsol Method** - Creates execution requests directly using the Bonsol interface

## Overview

This client demonstrates how to interact with the Bonsol zero-knowledge execution network from Rust using a **calculator ZK program**. The calculator can perform basic arithmetic operations (add, subtract, multiply, divide) on two operands and prove the computation result using zero-knowledge proofs.

## Features

- 🧮 Calculator ZK program execution (add, subtract, multiply, divide)
- ✅ Create execution requests via the example program 
- ✅ Create execution requests directly via Bonsol interface
- ✅ Handle PDAs and account derivation
- ✅ Support for public inputs (operation code and operands)
- ✅ Callback configuration
- ✅ Automatic airdrop for testing
- ✅ Explorer integration

## Installation

Make sure you have Rust installed, then:

```bash
cd client
cargo build
```

## Usage

### Basic Usage

```bash
# Calculate 2 + 12 using direct Bonsol interface (default)
cargo run

# Calculate 10 * 5 using direct Bonsol interface
cargo run -- --operation multiply --operand-a 10 --operand-b 5

# Calculate 100 / 4 via example program
cargo run -- --method example-program --operation divide --operand-a 100 --operand-b 4

# Subtract with custom execution ID
cargo run -- \
  --operation subtract \
  --operand-a 50 \
  --operand-b 25 \
  --execution-id "my_calc_123" \
  --rpc-url "https://api.devnet.solana.com"
```

### Command Line Options

```
Options:
      --rpc-url <RPC_URL>
          RPC URL for the Solana cluster [default: http://127.0.0.1:8899]
      
      --execution-id <EXECUTION_ID>
          Execution ID (16 bytes, padded if shorter) [default: calc_exec_1]
      
      --operation <OPERATION>
          Calculator operation (add, subtract, multiply, divide) [default: add]
      
      --operand-a <OPERAND_A>
          First operand [default: 2]
      
      --operand-b <OPERAND_B>
          Second operand [default: 12]
      
      --expiration-slots <EXPIRATION_SLOTS>
          Expiration in slots from current slot [default: 1000]
      
      --airdrop <AIRDROP>
          Whether to airdrop SOL to the payer (for devnet/localnet) [default: true]
      
      --method <METHOD>
          Execution method: "example-program" or "direct-bonsol" [default: direct-bonsol]
```

## Calculator Operations

The ZK calculator supports these operations:

| Operation | Code | Symbol | Example Usage |
|-----------|------|--------|---------------|
| Addition | 0 | + | `--operation add --operand-a 5 --operand-b 3` |
| Subtraction | 1 | - | `--operation subtract --operand-a 10 --operand-b 4` |
| Multiplication | 2 | * | `--operation multiply --operand-a 7 --operand-b 6` |
| Division | 3 | / | `--operation divide --operand-a 20 --operand-b 4` |

## Methods Explained

### Direct Bonsol Method (`--method direct-bonsol`) - **Recommended**

This method creates execution requests directly using the Bonsol interface:

1. Client → Bonsol Program (directly)
2. Bonsol Network executes the calculator ZK proof
3. Bonsol → Callback Program (with the calculated result)

**Advantages:**
- More direct and efficient
- Lower transaction fees
- Simpler account management

### Example Program Method (`--method example-program`)

This method calls the example Bonsol program which then creates an execution request:

1. Client → Example Program (instruction 0)
2. Example Program → Bonsol Program (via CPI)
3. Bonsol Network executes the calculator ZK proof
4. Bonsol → Example Program (callback with instruction 1)

**Advantages:**
- Demonstrates how to integrate Bonsol into your own programs
- Shows PDA management and account handling

## Constants

The client uses these constants from the calculator ZK program:

```rust
// Calculator ZK program (from zk-program/manifest.json)
const CALCULATOR_IMAGE_ID: &str = "5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91";
const CALLBACK_PROGRAM_ID: &str = "2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6";

// Calculator operation codes (from zk-program/src/main.rs)
const OP_ADD: i64 = 0;
const OP_SUBTRACT: i64 = 1;
const OP_MULTIPLY: i64 = 2;
const OP_DIVIDE: i64 = 3;
```

## Input Format

The calculator ZK program expects three inputs as i64 little-endian bytes:

1. **Operation Code** (8 bytes): 0=add, 1=subtract, 2=multiply, 3=divide
2. **Operand A** (8 bytes): First number
3. **Operand B** (8 bytes): Second number

For example, to calculate `5 + 3`:
- Operation: `0` (add) → `[0, 0, 0, 0, 0, 0, 0, 0]`
- Operand A: `5` → `[5, 0, 0, 0, 0, 0, 0, 0]`
- Operand B: `3` → `[3, 0, 0, 0, 0, 0, 0, 0]`

## Example Output

```
🧮 Starting Bonsol Calculator execution request client...
📋 Method: direct-bonsol
💰 Payer pubkey: 7xX8j9K2LmN3pQ4rS5tU6vW7yZ8aB9cD0eF1gH2iJ3kL
💸 Requesting airdrop...
⏳ Waiting for airdrop confirmation...
✅ Airdrop confirmed!
🧮 Calculator operation: 2 + 12 = ?

🎯 Creating calculator execution request directly via Bonsol interface...
🆔 Execution ID: calc_exec_1
📍 Requester: 7xX8j9K2LmN3pQ4rS5tU6vW7yZ8aB9cD0eF1gH2iJ3kL
⏰ Expiration slot: 105000 (current: 104000)
🔢 Calculator inputs:
   Operation: 0 ([0, 0, 0, 0, 0, 0, 0, 0])
   Operand A: 2 ([2, 0, 0, 0, 0, 0, 0, 0])
   Operand B: 12 ([12, 0, 0, 0, 0, 0, 0, 0])
✅ Created Bonsol calculator execution instruction
📦 Instruction data length: 245 bytes
👥 Accounts: 6 accounts
🔧 Creating and sending transaction...
🎉 Transaction sent successfully!
📋 Signature: 3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h
🔗 Explorer: https://explorer.solana.com/tx/3x4y5z6a...

📊 Calculator Execution Request Summary:
   Image ID: 5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91
   Execution ID: calc_exec_1
   Operation: 2 + 12
   Method: direct-bonsol
   Expected result will be computed by the ZK program!
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Rust Client   │───▶│ Bonsol Program  │───▶│ Calculator ZK   │
│  (sends a+b)    │    │                 │    │ Program         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Callback      │◀───│ ZK Proof of     │
                       │   Handler       │    │ a+b=result      │
                       │  (gets result)  │    └─────────────────┘
                       └─────────────────┘
```

## Calculator ZK Program Details

The calculator ZK program (located in `../zk-program/`) is built on RISC0 and:

1. **Reads** three i64 inputs (operation, operand_a, operand_b)
2. **Performs** the specified arithmetic operation
3. **Validates** inputs (e.g., checks for division by zero)
4. **Commits** the result as a 32-byte padded string
5. **Generates** a zero-knowledge proof of the computation

## Development

To extend this client:

1. Add support for more complex mathematical operations
2. Implement batch calculations
3. Add input validation and error handling
4. Support for floating-point operations (requires ZK program changes)
5. Add result verification and display

## Dependencies

- `solana-sdk` - Solana blockchain interaction
- `bonsol-interface` - Bonsol program interface  
- `clap` - Command line argument parsing
- `anyhow` - Error handling
- `sha2` - Cryptographic hashing
- `hex` - Hex encoding/decoding

## Related Files

- `../zk-program/` - The RISC0-based calculator ZK program
- `../zk-program/inputs.json` - Example input format
- `../zk-program/execution-request.json` - Example execution request

## License

MIT License 
