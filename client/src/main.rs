use anyhow::{Context, Result};
use bonsol_interface::instructions::{execute_v1, CallbackConfig, ExecutionConfig, InputRef};
use bonsol_interface::util::execution_address;
use clap::Parser;
use sha2::{Digest, Sha256};
use solana_client::rpc_client::RpcClient;
use solana_program::instruction::AccountMeta;
use solana_program::system_program;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::str::FromStr;
use borsh::{BorshSerialize};

// Define the structure for the callback data, mirroring the on-chain program.
// This is needed to serialize the instruction data.
#[derive(BorshSerialize, Debug)]
pub struct CallbackData {
    pub message: String,
}

// Calculator ZK program constants (from zk-program folder)
const CALCULATOR_IMAGE_ID: &str = "5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91";
const CALLBACK_PROGRAM_ID: &str = "2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6";

// Example program constants (for reference)
const EXAMPLE_PROGRAM_ID: &str = "exay1T7QqsJPNcwzMiWubR6vZnqrgM16jZRraHgqBGG";

// Extra accounts from the execution request
const EA1: &str = "3b6DR2gbTJwrrX27VLEZ2FJcHrDvTSLKEcTLVhdxCoaf";
const EA2: &str = "g7dD1FHSemkUQrX1Eak37wzvDjscgBW2pFCENwjLdMX";
const EA3: &str = "FHab8zDcP1DooZqXHWQowikqtXJb1eNHc46FEh1KejmX";

// Calculator operations
const OP_ADD: i64 = 0;
const OP_SUBTRACT: i64 = 1;
const OP_MULTIPLY: i64 = 2;
const OP_DIVIDE: i64 = 3;

#[derive(Parser)]
#[command(name = "bonsol-calculator-client")]
#[command(about = "A client for creating calculator execution requests on Bonsol")]
struct Cli {
    /// RPC URL for the Solana cluster
    #[arg(long, default_value = "http://127.0.0.1:8899")]
    rpc_url: String,

    /// Execution ID (16 bytes, padded if shorter)
    #[arg(long, default_value = "calc_exec_1")]
    execution_id: String,

    /// Calculator operation (add, subtract, multiply, divide)
    #[arg(long, default_value = "add")]
    operation: String,

    /// First operand
    #[arg(long, default_value = "2")]
    operand_a: i64,

    /// Second operand  
    #[arg(long, default_value = "12")]
    operand_b: i64,

    /// Expiration in slots from current slot
    #[arg(long, default_value = "1000")]
    expiration_slots: u64,

    /// Whether to airdrop SOL to the payer (for devnet/localnet)
    #[arg(long, default_value = "true")]
    airdrop: bool,

    /// Execution method: "example-program" or "direct-bonsol"
    #[arg(long, default_value = "direct-bonsol")]
    method: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    println!("🧮 Starting Bonsol Calculator execution request client...");
    println!("📋 Method: {}", cli.method);
    
    let client = RpcClient::new(&cli.rpc_url);

    // Create a new keypair to pay for the transaction
    let payer = Keypair::new();
    println!("💰 Payer pubkey: {}", payer.pubkey());

    // Airdrop SOL to the payer if requested
    if cli.airdrop {
        println!("💸 Requesting airdrop...");
        match client.request_airdrop(&payer.pubkey(), 2_000_000_000) {
            Ok(sig) => {
                println!("⏳ Waiting for airdrop confirmation...");
                loop {
                    if client.confirm_transaction(&sig)? {
                        println!("✅ Airdrop confirmed!");
                        break;
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                }
            }
            Err(e) => {
                println!("⚠️ Airdrop failed: {:?}", e);
                println!("Continuing anyway...");
            }
        }
    }

    // Convert operation string to operation code
    let op_code = match cli.operation.to_lowercase().as_str() {
        "add" => OP_ADD,
        "subtract" | "sub" => OP_SUBTRACT,
        "multiply" | "mul" => OP_MULTIPLY,
        "divide" | "div" => OP_DIVIDE,
        _ => {
            println!("❌ Invalid operation. Use: add, subtract, multiply, or divide");
            return Ok(());
        }
    };

    let op_symbol = match op_code {
        OP_ADD => "+",
        OP_SUBTRACT => "-", 
        OP_MULTIPLY => "*",
        OP_DIVIDE => "/",
        _ => "?",
    };

    println!("🧮 Calculator operation: {} {} {} = ?", cli.operand_a, op_symbol, cli.operand_b);

    match cli.method.as_str() {
        "example-program" => {
            create_execution_via_example_program(&client, &cli, &payer, op_code).await?;
        }
        "direct-bonsol" => {
            create_execution_directly(&client, &cli, &payer, op_code).await?;
        }
        _ => {
            println!("❌ Invalid method. Use 'example-program' or 'direct-bonsol'");
            return Ok(());
        }
    }

    Ok(())
}

async fn create_execution_via_example_program(
    client: &RpcClient,
    cli: &Cli,
    payer: &Keypair,
    op_code: i64,
) -> Result<()> {
    println!("\n🎯 Creating calculator execution request via example program...");
    
    let program_id = Pubkey::from_str(EXAMPLE_PROGRAM_ID)
        .context("Failed to parse example program ID")?;

    // Prepare execution ID (pad to 16 bytes)
    let execution_id = format!("{:0<16}", cli.execution_id);
    let execution_id = &execution_id[..16.min(execution_id.len())];
    println!("🆔 Execution ID: {}", execution_id);

    // Create input hash based on calculator inputs
    let input_data = format!("{},{},{}", op_code, cli.operand_a, cli.operand_b);
    let mut hasher = Sha256::new();
    hasher.update(input_data.as_bytes());
    let input_hash = hasher.finalize();
    println!("🔒 Input hash: {}", hex::encode(&input_hash));

    // Derive the requester PDA (using execution_id as seed)
    let (requester_pda, bump) = Pubkey::find_program_address(
        &[execution_id.as_bytes()],
        &program_id,
    );
    println!("📍 Requester PDA: {} (bump: {})", requester_pda, bump);

    // Derive the execution account PDA (from bonsol interface)
    let (execution_account_pda, _) = execution_address(
        &requester_pda,
        execution_id.as_bytes(),
    );
    println!("⚡ Execution account PDA: {}", execution_account_pda);

    // Create the instruction data for the example program (instruction 0)
    let mut instruction_data = Vec::new();
    instruction_data.push(0u8); // Instruction index 0
    instruction_data.extend_from_slice(execution_id.as_bytes()); // 16 bytes
    instruction_data.extend_from_slice(&input_hash[..]); // 32 bytes
    instruction_data.extend_from_slice(&cli.expiration_slots.to_le_bytes()); // 8 bytes
    instruction_data.push(bump); // 1 byte
    // For the calculator, we'll use the formatted input data as "private input URL"
    instruction_data.extend_from_slice(input_data.as_bytes()); // Variable length

    println!("📦 Instruction data length: {} bytes", instruction_data.len());

    // Create accounts for the instruction
    let accounts = vec![
        AccountMeta::new(payer.pubkey(), true),          // payer
        AccountMeta::new(requester_pda, false),          // requester PDA
        AccountMeta::new_readonly(system_program::id(), false), // system program
        AccountMeta::new(execution_account_pda, false),  // execution account PDA
    ];

    send_transaction(client, cli, payer, program_id, instruction_data, accounts).await
}

async fn create_execution_directly(
    client: &RpcClient,
    cli: &Cli,
    payer: &Keypair,
    op_code: i64,
) -> Result<()> {
    println!("\n🎯 Creating calculator execution request directly via Bonsol interface...");

    // For direct execution, we'll use the payer as the requester
    let requester = payer.pubkey();
    
    // Prepare execution ID (pad to 16 bytes)
    let execution_id = format!("{:0<16}", cli.execution_id);
    let execution_id = &execution_id[..16.min(execution_id.len())];
    println!("🆔 Execution ID: {}", execution_id);
    println!("📍 Requester: {}", requester);

    // Get current slot for expiration calculation
    let current_slot = client.get_slot().context("Failed to get current slot")?;
    let expiration = current_slot + cli.expiration_slots;
    println!("⏰ Expiration slot: {} (current: {})", expiration, current_slot);

    // Create the calculator inputs as the ZK program expects them
    // Use the working approach: combine all 3 i64 values into a single 24-byte input
    let operation_bytes = op_code.to_le_bytes();
    let operand_a_bytes = cli.operand_a.to_le_bytes();
    let operand_b_bytes = cli.operand_b.to_le_bytes();

    // Combine all three 8-byte values into a single 24-byte input
    let mut combined_input = Vec::with_capacity(24);
    combined_input.extend_from_slice(&operation_bytes);
    combined_input.extend_from_slice(&operand_a_bytes);
    combined_input.extend_from_slice(&operand_b_bytes);

    println!("🔢 Calculator inputs (combined into single 24-byte input - WORKING FORMAT):");
    println!("   Operation: {} -> {:?}", op_code, operation_bytes);
    println!("   Operand A: {} -> {:?}", cli.operand_a, operand_a_bytes);
    println!("   Operand B: {} -> {:?}", cli.operand_b, operand_b_bytes);
    println!("   Combined:  {:?} (length: {})", combined_input, combined_input.len());

    // Create the execution instruction using bonsol interface
    let tip = 1000_u64; // 1000 lamports tip
    
    let execution_config = ExecutionConfig {
        verify_input_hash: false, // As specified in execution-request.json
        input_hash: None,
        forward_output: true,
    };

    // Create callback config matching the execution-request.json
    let ea1 = Pubkey::from_str(EA1).context("Failed to parse EA1")?;
    let ea2 = Pubkey::from_str(EA2).context("Failed to parse EA2")?;
    let ea3 = Pubkey::from_str(EA3).context("Failed to parse EA3")?;
    let callback_program_id = Pubkey::from_str(CALLBACK_PROGRAM_ID)
        .context("Failed to parse callback program ID")?;

    let callback_config = Some(CallbackConfig {
        program_id: callback_program_id,
        instruction_prefix: vec![1], // Callback instruction
        extra_accounts: vec![
            AccountMeta::new_readonly(ea1, false), // EA1 is readonly
            AccountMeta::new(ea2, false),          // EA2 is writable
            AccountMeta::new_readonly(ea3, false), // EA3 is readonly
        ],
    });

    // Create the execution instruction
    let execution_instruction = execute_v1(
        &requester,
        &payer.pubkey(),
        CALCULATOR_IMAGE_ID,
        execution_id,
        vec![
            // Send all three calculator inputs as a single combined 24-byte input
            InputRef::public(&combined_input),
        ],
        tip,
        expiration,
        execution_config,
        callback_config,
        None, // Use default prover version
    ).context("Failed to create execution instruction")?;

    println!("✅ Created Bonsol calculator execution instruction");
    println!("📦 Instruction data length: {} bytes", execution_instruction.data.len());
    println!("👥 Accounts: {} accounts", execution_instruction.accounts.len());

    // Debug: Print the raw instruction data
    println!("\n🔍 DEBUG: Execution Request Details:");
    println!("   Program ID: {}", execution_instruction.program_id);
    println!("   Instruction data (hex): {}", hex::encode(&execution_instruction.data));
    println!("   Instruction data length: {} bytes", execution_instruction.data.len());
    
    // Debug: Print each account
    println!("\n📋 Accounts in instruction:");
    for (i, account) in execution_instruction.accounts.iter().enumerate() {
        println!("   [{}] {} (writable: {}, signer: {})", 
                 i, account.pubkey, account.is_writable, account.is_signer);
    }

    // Debug: Print the inputs being sent
    println!("\n📥 Input being sent:");
    println!("   Single combined input: {:?} (length: {})", &combined_input, combined_input.len());
    
    // Debug: Print what the ZK program expects to read
    println!("\n🧮 ZK Program expects to read:");
    println!("   3 sequential calls to env::read_slice() with 8-byte arrays each");
    println!("   From the single combined 24-byte input");
    
    // Show how the ZK program should parse this
    println!("\n🔄 How ZK program should parse the combined input:");
    println!("   Bytes 0-7:   {:?} -> i64::from_le_bytes() = {}", &combined_input[0..8], op_code);
    println!("   Bytes 8-15:  {:?} -> i64::from_le_bytes() = {}", &combined_input[8..16], cli.operand_a);
    println!("   Bytes 16-23: {:?} -> i64::from_le_bytes() = {}", &combined_input[16..24], cli.operand_b);

    // Send the transaction
    send_instruction(client, cli, payer, execution_instruction).await
}

async fn send_transaction(
    client: &RpcClient,
    cli: &Cli,
    payer: &Keypair,
    program_id: Pubkey,
    instruction_data: Vec<u8>,
    accounts: Vec<AccountMeta>,
) -> Result<()> {
    // Create the instruction
    let instruction = Instruction::new_with_bytes(
        program_id,
        &instruction_data,
        accounts,
    );

    send_instruction(client, cli, payer, instruction).await
}

async fn send_instruction(
    client: &RpcClient,
    cli: &Cli,
    payer: &Keypair,
    instruction: Instruction,
) -> Result<()> {
    println!("🔧 Creating and sending transaction...");

    // Get latest blockhash and create transaction
    let latest_blockhash = client
        .get_latest_blockhash()
        .context("Failed to get latest blockhash")?;

    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        latest_blockhash,
    );

    // Send and confirm the transaction
    match client.send_and_confirm_transaction(&transaction) {
        Ok(signature) => {
            println!("🎉 Transaction sent successfully!");
            println!("📋 Signature: {}", signature);
            println!("🔗 Explorer: https://explorer.solana.com/tx/{}?cluster=custom&customUrl={}", 
                     signature, urlencoding::encode(&cli.rpc_url));
            
            // Print summary
            println!("\n📊 Calculator Execution Request Summary:");
            println!("   Image ID: {}", CALCULATOR_IMAGE_ID);
            println!("   Execution ID: {}", cli.execution_id);
            println!("   Operation: {} {} {}", cli.operand_a, 
                     match cli.operation.as_str() {
                         "add" => "+",
                         "subtract" => "-",
                         "multiply" => "*", 
                         "divide" => "/",
                         _ => &cli.operation,
                     }, cli.operand_b);
            println!("   Method: {}", cli.method);
            println!("   Expected result will be computed by the ZK program!");
        }
        Err(e) => {
            println!("❌ Error sending transaction: {:?}", e);
            return Err(e.into());
        }
    }

    Ok(())
} 
