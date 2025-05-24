import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as borsh from 'borsh';

// Calculator program constants
export const CALCULATOR_PROGRAM_ID = new PublicKey('2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6');
export const CALCULATOR_IMAGE_ID = '5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91';

// Calculator operations
export enum CalculatorOperation {
  ADD = 0,
  SUBTRACT = 1,
  MULTIPLY = 2,
  DIVIDE = 3,
}

export interface CalculationRecord {
  executionId: string;
  operation: CalculatorOperation;
  operandA: number;
  operandB: number;
  result?: number;
  timestamp: number;
  isComplete: boolean;
}

export interface CalculatorState {
  isInitialized: boolean;
  owner: PublicKey;
  calculationCount: number;
  lastCalculation?: CalculationRecord;
}

// Instruction schemas for borsh serialization
class InitializeSchema {
  constructor() {}
}

class SubmitCalculationSchema {
  executionId: string;
  operation: number;
  operandA: number;
  operandB: number;

  constructor(args: {
    executionId: string;
    operation: number;
    operandA: number;
    operandB: number;
  }) {
    this.executionId = args.executionId;
    this.operation = args.operation;
    this.operandA = args.operandA;
    this.operandB = args.operandB;
  }
}

class GetHistorySchema {
  constructor() {}
}

const INSTRUCTION_SCHEMAS = new Map([
  [InitializeSchema, { kind: 'struct', fields: [] }],
  [SubmitCalculationSchema, { 
    kind: 'struct', 
    fields: [
      ['executionId', 'string'],
      ['operation', 'u64'],
      ['operandA', 'u64'], 
      ['operandB', 'u64'],
    ] 
  }],
  [GetHistorySchema, { kind: 'struct', fields: [] }],
]);

export class CalculatorClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey = CALCULATOR_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Derive calculator state account PDA for a user
   */
  public async getCalculatorStateAddress(userPublicKey: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from('calculator_state'), userPublicKey.toBuffer()],
      this.programId
    );
  }

  /**
   * Initialize calculator backend for a user
   */
  public async initialize(
    payer: Keypair,
    userPublicKey?: PublicKey
  ): Promise<string> {
    const user = userPublicKey || payer.publicKey;
    const [calculatorStateAccount] = await this.getCalculatorStateAddress(user);

    // Check if already initialized
    try {
      const accountInfo = await this.connection.getAccountInfo(calculatorStateAccount);
      if (accountInfo !== null) {
        throw new Error('Calculator backend already initialized for this user');
      }
    } catch (error) {
      // Account doesn't exist, continue with initialization
    }

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: calculatorStateAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.concat([
        Buffer.from([0]), // Initialize instruction
        borsh.serialize(INSTRUCTION_SCHEMAS, new InitializeSchema()),
      ]),
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  /**
   * Submit a calculation request to the ZK network
   */
  public async submitCalculation(
    payer: Keypair,
    operation: CalculatorOperation,
    operandA: number,
    operandB: number,
    executionId?: string,
    userPublicKey?: PublicKey
  ): Promise<string> {
    const user = userPublicKey || payer.publicKey;
    const [calculatorStateAccount] = await this.getCalculatorStateAddress(user);
    
    // Generate unique execution ID if not provided
    const finalExecutionId = executionId || `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Derive execution account (this would be handled by Bonsol)
    const executionAccount = Keypair.generate().publicKey; // Placeholder

    const submitCalculationData = new SubmitCalculationSchema({
      executionId: finalExecutionId,
      operation: operation,
      operandA: operandA,
      operandB: operandB,
    });

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: calculatorStateAccount, isSigner: false, isWritable: true },
        { pubkey: executionAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.concat([
        Buffer.from([1]), // SubmitCalculation instruction
        borsh.serialize(INSTRUCTION_SCHEMAS, submitCalculationData),
      ]),
    });

    const transaction = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    return signature;
  }

  /**
   * Get calculation history for a user
   */
  public async getHistory(userPublicKey: PublicKey): Promise<CalculatorState | null> {
    const [calculatorStateAccount] = await this.getCalculatorStateAddress(userPublicKey);
    
    try {
      const accountInfo = await this.connection.getAccountInfo(calculatorStateAccount);
      if (!accountInfo) {
        return null;
      }

      // Parse the account data (you'd need to implement borsh deserialization)
      // For now, return a placeholder
      return {
        isInitialized: true,
        owner: userPublicKey,
        calculationCount: 0,
        lastCalculation: undefined,
      };
    } catch (error) {
      console.error('Error fetching calculator history:', error);
      return null;
    }
  }

  /**
   * Watch for calculation completion (poll for results)
   */
  public async watchCalculation(
    userPublicKey: PublicKey,
    onUpdate: (state: CalculatorState) => void,
    intervalMs: number = 2000
  ): Promise<() => void> {
    const interval = setInterval(async () => {
      const state = await this.getHistory(userPublicKey);
      if (state) {
        onUpdate(state);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }

  /**
   * Utility function to get operation symbol
   */
  public static getOperationSymbol(operation: CalculatorOperation): string {
    switch (operation) {
      case CalculatorOperation.ADD: return '+';
      case CalculatorOperation.SUBTRACT: return '-';
      case CalculatorOperation.MULTIPLY: return '*';
      case CalculatorOperation.DIVIDE: return '/';
      default: return '?';
    }
  }

  /**
   * Utility function to format calculation
   */
  public static formatCalculation(record: CalculationRecord): string {
    const symbol = this.getOperationSymbol(record.operation);
    if (record.isComplete && record.result !== undefined) {
      return `${record.operandA} ${symbol} ${record.operandB} = ${record.result}`;
    } else {
      return `${record.operandA} ${symbol} ${record.operandB} = (calculating...)`;
    }
  }
} 
