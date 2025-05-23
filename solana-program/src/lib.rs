use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
};

// Removed CallbackData struct, as we are now expecting raw ZK output after the prefix.
// If the ZK output has a known structure that can be borsh-deserialized,
// you can define a struct for it here and attempt deserialization.

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,      // Not currently used
    _accounts: &[AccountInfo], // Not currently used
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Bonsol Callback Program Entrypoint - ZK Output Handler");

    if instruction_data.is_empty() {
        msg!("Error: Instruction data is empty!");
        return Err(ProgramError::InvalidInstructionData);
    }

    // Assuming the first byte is the prefix, as configured in execution-request.json
    let prefix = instruction_data[0];
    msg!("Received instruction prefix: {}", prefix);

    // The rest of the data is assumed to be the ZK proof output
    if instruction_data.len() < 2 {
        msg!("Warning: Instruction data contains only the prefix, no ZK output data.");
        // Depending on requirements, this might be an error or just an empty output case.
        // For now, we'll log and proceed.
        msg!("ZK Proof Output (raw bytes): []");
    } else {
        let zk_output_data = &instruction_data[1..];
        msg!("ZK Proof Output (raw bytes): {:?}", zk_output_data);
        // If you know the format of zk_output_data, you can try to parse/deserialize it here.
        // For example, if it's a UTF-8 string:
        // match std::str::from_utf8(zk_output_data) {
        //     Ok(s) => msg!("ZK Proof Output (as string): {}", s),
        //     Err(_) => msg!("ZK Proof Output is not valid UTF-8 string."),
        // }
    }

    Ok(())
}

// TODO: Implement callback instruction parsing and handling logic. 
