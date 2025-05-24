use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use borsh::{BorshDeserialize, BorshSerialize};
use std::str::FromStr;

// Our program ID (you'll need to update this after deployment)
const PROGRAM_ID: &str = "2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6";

// Calculator operations
const OP_ADD: i64 = 0;
const OP_MULTIPLY: i64 = 2;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum CalculatorInstruction {
    Initialize,
    SubmitCalculation {
        execution_id: String,
        operation: i64,
        operand_a: i64,
        operand_b: i64,
    },
    GetHistory,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CalculatorState {
    pub is_initialized: bool,
    pub owner: Pubkey,
    pub calculation_count: u64,
    pub last_calculation: Option<CalculationRecord>,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CalculationRecord {
    pub execution_id: String,
    pub operation: i64,
    pub operand_a: i64,
    pub operand_b: i64,
    pub result: Option<i64>,
    pub timestamp: i64,
    pub is_complete: bool,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🧮 Testing Bonsol Calculator Program");

    // Connect to localnet (you can change this to devnet)
    let rpc_url = "http://127.0.0.1:8899";
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());

    // Create a keypair for testing
    let payer = Keypair::new();
    println!("💰 Test wallet: {}", payer.pubkey());

    // Get the program ID
    let program_id = Pubkey::from_str(PROGRAM_ID)?;
    println!("📦 Program ID: {}", program_id);

    // Airdrop SOL for testing
    println!("💸 Requesting airdrop...");
    match client.request_airdrop(&payer.pubkey(), 2_000_000_000) {
        Ok(sig) => {
            println!("🔄 Airdrop signature: {}", sig);
            // Wait a bit for confirmation
            std::thread::sleep(std::time::Duration::from_secs(2));
        }
        Err(e) => {
            println!("⚠️ Airdrop failed: {}", e);
            println!("Continuing anyway (maybe wallet already has SOL)...");
        }
    }

    // Create a regular keypair for the calculator state account
    let calculator_state_keypair = Keypair::new();
    let calculator_state_pubkey = calculator_state_keypair.pubkey();
    println!("📍 Calculator state account: {}", calculator_state_pubkey);

    // Test 1: Initialize the calculator
    println!("\n🧪 Test 1: Initialize calculator");
    let init_instruction = create_init_instruction(&program_id, &payer.pubkey(), &calculator_state_pubkey)?;
    send_transaction(&client, &payer, vec![&calculator_state_keypair], vec![init_instruction])?;
    println!("✅ Calculator initialized");

    // Test 2: Submit a calculation (5 + 3)
    println!("\n🧪 Test 2: Calculate 5 + 3");
    let calc_instruction = create_calculation_instruction(
        &program_id,
        &payer.pubkey(),
        &calculator_state_pubkey,
        "test_add_001",
        OP_ADD,
        5,
        3,
    )?;
    send_transaction(&client, &payer, vec![], vec![calc_instruction])?;
    println!("✅ Calculation submitted");

    // Test 3: Submit another calculation (7 * 6)
    println!("\n🧪 Test 3: Calculate 7 * 6");
    let calc_instruction = create_calculation_instruction(
        &program_id,
        &payer.pubkey(),
        &calculator_state_pubkey,
        "test_mul_002",
        OP_MULTIPLY,
        7,
        6,
    )?;
    send_transaction(&client, &payer, vec![], vec![calc_instruction])?;
    println!("✅ Calculation submitted");

    // Test 4: Read the calculator state
    println!("\n🧪 Test 4: Read calculator state");
    match client.get_account(&calculator_state_pubkey) {
        Ok(account) => {
            if let Ok(state) = CalculatorState::try_from_slice(&account.data) {
                println!("📊 Calculator State:");
                println!("   Initialized: {}", state.is_initialized);
                println!("   Owner: {}", state.owner);
                println!("   Calculation count: {}", state.calculation_count);
                
                if let Some(ref calc) = state.last_calculation {
                    let op_symbol = match calc.operation {
                        0 => "+",
                        2 => "*",
                        _ => "?",
                    };
                    println!("   Last calculation: {} {} {} = {:?}", 
                             calc.operand_a, op_symbol, calc.operand_b, calc.result);
                    println!("   Execution ID: {}", calc.execution_id);
                    println!("   Complete: {}", calc.is_complete);
                }
            } else {
                println!("❌ Failed to deserialize calculator state");
            }
        }
        Err(e) => {
            println!("❌ Failed to read calculator state: {}", e);
        }
    }

    println!("\n🎉 All tests completed!");
    Ok(())
}

fn create_init_instruction(
    program_id: &Pubkey,
    payer: &Pubkey,
    calculator_state_account: &Pubkey,
) -> Result<Instruction, Box<dyn std::error::Error>> {
    let instruction_data = CalculatorInstruction::Initialize.try_to_vec()?;

    Ok(Instruction::new_with_bytes(
        *program_id,
        &instruction_data,
        vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(*calculator_state_account, true), // This account needs to sign
            AccountMeta::new_readonly(solana_sdk::system_program::id(), false),
        ],
    ))
}

fn create_calculation_instruction(
    program_id: &Pubkey,
    payer: &Pubkey,
    calculator_state_account: &Pubkey,
    execution_id: &str,
    operation: i64,
    operand_a: i64,
    operand_b: i64,
) -> Result<Instruction, Box<dyn std::error::Error>> {
    let instruction_data = CalculatorInstruction::SubmitCalculation {
        execution_id: execution_id.to_string(),
        operation,
        operand_a,
        operand_b,
    }
    .try_to_vec()?;

    Ok(Instruction::new_with_bytes(
        *program_id,
        &instruction_data,
        vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(*calculator_state_account, false), // This account doesn't need to sign for calculations
        ],
    ))
}

fn send_transaction(
    client: &RpcClient,
    payer: &Keypair,
    additional_signers: Vec<&Keypair>,
    instructions: Vec<Instruction>,
) -> Result<(), Box<dyn std::error::Error>> {
    let recent_blockhash = client.get_latest_blockhash()?;
    
    let mut all_signers = vec![payer];
    all_signers.extend(additional_signers);
    
    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&payer.pubkey()),
        &all_signers,
        recent_blockhash,
    );

    match client.send_and_confirm_transaction(&transaction) {
        Ok(signature) => {
            println!("✅ Transaction successful: {}", signature);
            Ok(())
        }
        Err(e) => {
            println!("❌ Transaction failed: {}", e);
            Err(e.into())
        }
    }
} 
