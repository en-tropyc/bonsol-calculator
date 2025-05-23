use risc0_zkvm::guest::env;

const OP_ADD: u8 = 0;
const OP_SUBTRACT: u8 = 1;
const OP_MULTIPLY: u8 = 2;
const OP_DIVIDE: u8 = 3;

fn read_i64_input(field_name: &str) -> i64 {
    let mut input_bytes = [0u8; 8]; // Assume host sends each decimal string as an 8-byte i64
    env::read_slice(&mut input_bytes);
    let number = i64::from_le_bytes(input_bytes);
    env::log(&format!("[ZK_GUEST_DEBUG] Read {}: {} (from bytes: {:?})", field_name, number, input_bytes));
    number
}

fn main() {
    env::log("[ZK_GUEST_DEBUG] Generic Calculator App Started - Decimal String Inputs Mode");

    // Read operation code
    // Host is assumed to convert "0", "1", "2", "3" from inputs.json into an i64.
    // We then take the i64 value and cast to u8.
    let op_i64 = read_i64_input("operation_as_i64");
    if op_i64 < 0 || op_i64 > u8::MAX as i64 {
        env::log(&format!("[ZK_GUEST_ERROR] Operation code {} out of u8 range!", op_i64));
        panic!("Operation code out of u8 range");
    }
    let operation = op_i64 as u8; // Cast to u8
    env::log(&format!("[ZK_GUEST_DEBUG] Parsed operation code: {}", operation));

    // Read operands
    let a = read_i64_input("operand_a");
    let b = read_i64_input("operand_b");

    let op_symbol = match operation {
        OP_ADD => "+",
        OP_SUBTRACT => "-",
        OP_MULTIPLY => "*",
        OP_DIVIDE => "/",
        _ => "?" // Should not happen if previous checks are in place
    };

    env::log(&format!("[ZK_GUEST_DEBUG] Performing operation: {} {} {}", a, op_symbol, b));

    let result = match operation {
        OP_ADD => a.checked_add(b),
        OP_SUBTRACT => a.checked_sub(b),
        OP_MULTIPLY => a.checked_mul(b),
        OP_DIVIDE => {
            if b == 0 {
                env::log("[ZK_GUEST_ERROR] Division by zero!");
                panic!("Division by zero");
            }
            a.checked_div(b)
        }
        _ => {
            env::log(&format!("[ZK_GUEST_ERROR] Unknown operation code: {}", operation));
            panic!("Unknown operation");
        }
    };

    match result {
        Some(value) => {
            env::log(&format!("[ZK_GUEST_DEBUG] Calculation result: {}", value));
            // Commit the string representation of the result
            let result_string = value.to_string();
            // Pad the string to 32 bytes
            let mut padded_result_bytes = [0u8; 32];
            let result_bytes = result_string.as_bytes();
            let len = result_bytes.len();

            if len > 32 {
                // If the string is somehow longer than 32 (e.g. very large negative number)
                // we'll truncate, though this case should be rare with i64.
                // Or, one could panic here if truncation is not desired.
                env::log(&format!("[ZK_GUEST_WARNING] Result string ({} bytes) too long, truncating to 32 bytes.", len));
                padded_result_bytes.copy_from_slice(&result_bytes[..32]);
            } else {
                // Copy the result bytes and fill the rest with spaces (or another padding char)
                padded_result_bytes[..len].copy_from_slice(result_bytes);
                for i in len..32 {
                    padded_result_bytes[i] = b' '; // Pad with spaces
                }
            }

            env::commit_slice(&padded_result_bytes);
            env::log(&format!("[ZK_GUEST_DEBUG] Result committed as 32-byte padded string: \"{}\"", String::from_utf8_lossy(&padded_result_bytes)));
        }
        None => {
            env::log("[ZK_GUEST_ERROR] Arithmetic overflow/underflow during calculation!");
            panic!("Arithmetic overflow/underflow");
        }
    }
}
