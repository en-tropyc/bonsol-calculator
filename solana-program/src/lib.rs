use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    program::invoke_signed,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
    clock::Clock,
};
use borsh::{BorshDeserialize, BorshSerialize};

// Program ID - you'll need to deploy this and update the ID
solana_program::declare_id!("2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6");

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
    
    /// Submit a calculation (for now, calculates immediately)
    SubmitCalculation {
        execution_id: String,
        operation: i64,
        operand_a: i64,
        operand_b: i64,
    },
    
    /// Get calculation history (read-only)
    GetHistory,
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

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            calculator_state_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[payer.clone(), calculator_state_account.clone(), system_program.clone()],
        &[],
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

    // Calculate result immediately (no ZK for now - just testing)
    let result = match operation {
        OP_ADD => operand_a + operand_b,
        OP_SUBTRACT => operand_a - operand_b,
        OP_MULTIPLY => operand_a * operand_b,
        OP_DIVIDE => {
            if operand_b == 0 {
                return Err(ProgramError::InvalidInstructionData);
            }
            operand_a / operand_b
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    };

    // Create calculation record
    let calculation = CalculationRecord {
        execution_id: execution_id.clone(),
        operation,
        operand_a,
        operand_b,
        result: Some(result),
        timestamp: Clock::get()?.unix_timestamp,
        is_complete: true,
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

    msg!("Calculated: {} {} {} = {}", operand_a, op_symbol, operand_b, result);
    msg!("Execution ID: {}", execution_id);

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

// TODO: Implement callback instruction parsing and handling logic. 
