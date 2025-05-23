use solana_client::rpc_client::RpcClient;
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

const PROGRAM_ID_STR: &str = "2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6"; // Updated with the new Program ID

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let rpc_url = String::from("http://127.0.0.1:8899");
    let client = RpcClient::new(rpc_url);

    let program_id = Pubkey::from_str(PROGRAM_ID_STR)?;

    // Create a new keypair to pay for the transaction and be the "sender"
    // In a real scenario, this would be loaded from a file or a secret manager.
    let payer = Keypair::new();

    // Airdrop some SOL to the payer account to cover transaction fees.
    // This is specific to local/devnet testing.
    match client.request_airdrop(&payer.pubkey(), 1_000_000_000) { // 1 SOL
        Ok(sig) => {
            loop {
                let confirmed = client.confirm_transaction(&sig)?;
                if confirmed {
                    println!("Airdrop confirmed.");
                    break;
                }
            }
        }
        Err(e) => {
            println!("Airdrop error: {:?}", e);
            // Potentially exit or handle, for now we'll try to proceed
        }
    }

    println!("Payer Pubkey: {}", payer.pubkey());

    // Prepare the instruction data
    let instruction_data = CallbackData {
        message: String::from("Hello from Rust client!"),
    };
    let serialized_data = instruction_data.try_to_vec()?;

    // Accounts required by the program (if any beyond the program_id itself).
    // For our simple callback, the program doesn't strictly need other accounts passed in this way,
    // but instructions generally do. For now, it's an empty vec.
    let accounts = vec![];

    let instruction = Instruction::new_with_borsh(
        program_id,
        &serialized_data,
        accounts,
    );

    let latest_blockhash = client.get_latest_blockhash()?;

    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        latest_blockhash,
    );

    match client.send_and_confirm_transaction(&transaction) {
        Ok(signature) => println!("Transaction sent successfully! Signature: {}", signature),
        Err(e) => eprintln!("Error sending transaction: {:?}", e),
    }

    Ok(())
} 
