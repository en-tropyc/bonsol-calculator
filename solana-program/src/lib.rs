use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    program::invoke,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
    clock::Clock,
};
use borsh::{BorshDeserialize, BorshSerialize};
use bonsol_interface::instructions::{execute_v1, CallbackConfig, ExecutionConfig, InputRef};

// Program ID - you'll need to deploy this and update the ID
solana_program::declare_id!("2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6");

// Calculator ZK program image ID
const CALCULATOR_IMAGE_ID: &str = "5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91";

// Calculator operations
const OP_ADD: i64 = 0;
const OP_SUBTRACT: i64 = 1;
const OP_MULTIPLY: i64 = 2;
const OP_DIVIDE: i64 = 3;

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

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum CalculatorInstruction {
    /// Initialize calculator state
    Initialize,
    
    /// Submit a calculation request to Bonsol ZK network
    SubmitCalculation {
        execution_id: String,
        operation: i64,
        operand_a: i64,
        operand_b: i64,
    },
    
    /// Get calculation history (read-only)
    GetHistory,
    
    /// Callback instruction from Bonsol when ZK computation completes
    Callback {
        execution_id: String,
        result: i64,
    },
}

impl CalculatorState {
    pub const LEN: usize = 1 + 32 + 8 + 200; // bool + pubkey + u64 + optional record
}

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = CalculatorInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        CalculatorInstruction::Initialize => initialize(program_id, accounts),
        CalculatorInstruction::SubmitCalculation {
            execution_id,
            operation,
            operand_a,
            operand_b,
        } => submit_calculation(
            program_id,
            accounts,
            execution_id,
            operation,
            operand_a,
            operand_b,
        ),
        CalculatorInstruction::GetHistory => get_history(accounts),
        CalculatorInstruction::Callback { execution_id, result } => callback(accounts, execution_id, result),
    }
}

fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let calculator_state_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Create the calculator state account
    let rent = Rent::get()?;
    let space = CalculatorState::LEN;
    let lamports = rent.minimum_balance(space);

    invoke(
        &system_instruction::create_account(
            payer.key,
            calculator_state_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[payer.clone(), calculator_state_account.clone(), system_program.clone()],
    )?;

    // Initialize the state
    let calculator_state = CalculatorState {
        is_initialized: true,
        owner: *payer.key,
        calculation_count: 0,
        last_calculation: None,
    };

    let mut data = calculator_state_account.try_borrow_mut_data()?;
    let serialized = calculator_state.try_to_vec()?;
    data[..serialized.len()].copy_from_slice(&serialized);

    msg!("Calculator backend initialized for owner: {}", payer.key);
    Ok(())
}

fn submit_calculation(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    execution_id: String,
    operation: i64,
    operand_a: i64,
    operand_b: i64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let calculator_state_account = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Validate operation
    if ![OP_ADD, OP_SUBTRACT, OP_MULTIPLY, OP_DIVIDE].contains(&operation) {
        return Err(ProgramError::InvalidInstructionData);
    }

    // Load calculator state
    let data = calculator_state_account.try_borrow_data()?;
    let mut calculator_state = CalculatorState::try_from_slice(&data)?;
    drop(data);
    
    if calculator_state.owner != *payer.key {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Create Bonsol execution request instead of calculating immediately
    msg!("Creating Bonsol execution request for {} {} {}", operand_a, match operation {
        OP_ADD => "+",
        OP_SUBTRACT => "-", 
        OP_MULTIPLY => "*",
        OP_DIVIDE => "/",
        _ => "?",
    }, operand_b);

    // Prepare inputs for ZK program (matching the format from client)
    let operation_bytes = operation.to_le_bytes();
    let operand_a_bytes = operand_a.to_le_bytes();
    let operand_b_bytes = operand_b.to_le_bytes();

    // Combine all three 8-byte values into a single 24-byte input
    let mut combined_input = Vec::with_capacity(24);
    combined_input.extend_from_slice(&operation_bytes);
    combined_input.extend_from_slice(&operand_a_bytes);
    combined_input.extend_from_slice(&operand_b_bytes);

    let inputs = vec![InputRef::public(&combined_input)];

    // Get current slot for expiration
    let current_slot = Clock::get()?.slot;
    let expiration = current_slot + 100; // 100 slots expiration

    // Create callback config to receive results
    let callback_config = Some(CallbackConfig {
        program_id: *_program_id,
        instruction_prefix: vec![2], // Callback instruction variant
        extra_accounts: vec![
            solana_program::instruction::AccountMeta::new(*calculator_state_account.key, false),
        ],
    });

    // Create the Bonsol execution instruction
    let execution_config = ExecutionConfig {
        verify_input_hash: false,
        input_hash: None,
        forward_output: true,
    };

    let bonsol_instruction = execute_v1(
        payer.key,
        payer.key,
        CALCULATOR_IMAGE_ID,
        &execution_id,
        inputs,
        1000, // tip in lamports
        expiration,
        execution_config,
        callback_config,
        None, // default prover version
    ).map_err(|_| ProgramError::InvalidInstructionData)?;

    msg!("Created Bonsol instruction with {} accounts", bonsol_instruction.accounts.len());
    msg!("Bonsol instruction program ID: {}", bonsol_instruction.program_id);

    // TODO: Invoke the Bonsol instruction - temporarily disabled for testing
    // invoke(&bonsol_instruction, accounts)?;
    msg!("Bonsol execution request created (invoke temporarily disabled for testing)");

    // Create calculation record (marked as pending)
    let calculation = CalculationRecord {
        execution_id: execution_id.clone(),
        operation,
        operand_a,
        operand_b,
        result: None, // No result yet - waiting for ZK computation
        timestamp: Clock::get()?.unix_timestamp,
        is_complete: false, // Still pending ZK proof
    };

    // Update state
    calculator_state.calculation_count += 1;
    calculator_state.last_calculation = Some(calculation);

    let mut data = calculator_state_account.try_borrow_mut_data()?;
    let serialized = calculator_state.try_to_vec()?;
    data[..serialized.len()].copy_from_slice(&serialized);

    let op_symbol = match operation {
        OP_ADD => "+",
        OP_SUBTRACT => "-",
        OP_MULTIPLY => "*",
        OP_DIVIDE => "/",
        _ => "?",
    };

    msg!("Submitted ZK execution request: {} {} {}", operand_a, op_symbol, operand_b);
    msg!("Execution ID: {}", execution_id);
    msg!("Awaiting ZK proof computation...");

    Ok(())
}

fn get_history(accounts: &[AccountInfo]) -> ProgramResult {
    let calculator_state_account = &accounts[0];
    let data = calculator_state_account.try_borrow_data()?;
    let calculator_state = CalculatorState::try_from_slice(&data)?;

    msg!("Calculator History:");
    msg!("Total calculations: {}", calculator_state.calculation_count);
    
    if let Some(ref calculation) = calculator_state.last_calculation {
        let op_symbol = match calculation.operation {
            OP_ADD => "+",
            OP_SUBTRACT => "-", 
            OP_MULTIPLY => "*",
            OP_DIVIDE => "/",
            _ => "?",
        };

        if calculation.is_complete {
            msg!("Last calculation: {} {} {} = {}", 
                 calculation.operand_a, op_symbol, calculation.operand_b, 
                 calculation.result.unwrap_or(0));
        } else {
            msg!("Last calculation: {} {} {} = (pending...)", 
                 calculation.operand_a, op_symbol, calculation.operand_b);
        }
    }

    Ok(())
}

fn callback(accounts: &[AccountInfo], execution_id: String, result: i64) -> ProgramResult {
    msg!("Callback received for execution ID: {}", execution_id);
    msg!("ZK computation result: {}", result);
    
    let account_info_iter = &mut accounts.iter();
    let calculator_state_account = next_account_info(account_info_iter)?;
    
    // Load calculator state
    let data = calculator_state_account.try_borrow_data()?;
    let mut calculator_state = CalculatorState::try_from_slice(&data)?;
    drop(data);
    
    // Update the last calculation with the result
    if let Some(ref mut calc) = calculator_state.last_calculation {
        if calc.execution_id == execution_id {
            calc.result = Some(result);
            calc.is_complete = true;
            
            let op_symbol = match calc.operation {
                OP_ADD => "+",
                OP_SUBTRACT => "-",
                OP_MULTIPLY => "*", 
                OP_DIVIDE => "/",
                _ => "?",
            };
            
            msg!("✅ ZK computation completed: {} {} {} = {}", 
                 calc.operand_a, op_symbol, calc.operand_b, result);
                 
            // Save updated state
            let mut data = calculator_state_account.try_borrow_mut_data()?;
            let serialized = calculator_state.try_to_vec()?;
            data[..serialized.len()].copy_from_slice(&serialized);
        } else {
            msg!("Warning: Execution ID mismatch in callback");
        }
    } else {
        msg!("Warning: No pending calculation found for callback");
    }
    
    Ok(())
}

// TODO: Implement callback instruction parsing and handling logic. 
