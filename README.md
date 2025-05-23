# ZK Calculator Project

A Zero-Knowledge proof calculator built using Risc0 and Solana integration.

## Project Structure

This project consists of three main components:

- **`zk-program/`** - The core zero-knowledge program built with Risc0
- **`solana-program/`** - A Solana program for blockchain integration  
- **`client/`** - A Rust client for interacting with the Solana program

## Components

### ZK Program (`zk-program/`)
A Bonsol zkprogram built on risc0 that handles zero-knowledge computations.

### Solana Program (`solana-program/`)
A Solana program (`bonsol-callback-program`) that provides blockchain functionality for the ZK calculator.

### Client (`client/`)
A Rust client application that demonstrates how to interact with the Solana program.

## Building and Running

### Prerequisites
- Rust toolchain
- Solana CLI tools
- Risc0 dependencies

### Build All Components
```bash
cargo build --workspace
```

### Build Individual Components
```bash
# Build ZK program
cargo build -p zk_calculator

# Build Solana program  
cargo build -p bonsol-callback-program

# Build client
cargo build -p solana-client-example
```

### Running
```bash
# Run the ZK program
cargo run -p zk_calculator

# Run the client
cargo run -p solana-client-example
```

## Development

This is a workspace project. Each component can be developed and tested independently while maintaining shared dependencies where appropriate.

## License

[Add your license information here] 
