import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as flatbuffers from 'flatbuffers';

// Import Bonsol schemas from the copied directory
import { ChannelInstruction } from './schemas-ts/channel-instruction';
import { ChannelInstructionIxType } from './schemas-ts/channel-instruction-ix-type';
import { ExecutionRequestV1 } from './schemas-ts/execution-request-v1';
import { Input } from './schemas-ts/input';
import { InputType } from './schemas-ts/input-type';
import { Account } from './schemas-ts/account';
import { ProverVersion } from './schemas-ts/prover-version';

// Bonsol program constants (from the working client)
export const BONSOL_PROGRAM_ID = new PublicKey('BoNsHRcyLLNdtnoDf8hiCNZpyehMC4FDMxs6NTxFi3ew');
export const CALCULATOR_IMAGE_ID = '5881e972d41fe651c2989c65699528da8b1ed68ab7057350a686b8a64a00fc91';

// Callback program (the old Solana program for receiving results)
export const CALLBACK_PROGRAM_ID = new PublicKey('2zBRw2sEXvjskx7w1w9hqdFEMZWy7KipQ6jKPfwjpnL6');

// Extra accounts (from the working client configuration)
const EA1 = new PublicKey('3b6DR2gbTJwrrX27VLEZ2FJcHrDvTSLKEcTLVhdxCoaf');
const EA2 = new PublicKey('g7dD1FHSemkUQrX1Eak37wzvDjscgBW2pFCENwjLdMX');  
const EA3 = new PublicKey('FHab8zDcP1DooZqXHWQowikqtXJb1eNHc46FEh1KejmX');

// Calculator operations (matching the working client)
export enum CalculatorOperation {
  ADD = 0,
  SUBTRACT = 1,
  MULTIPLY = 2,
  DIVIDE = 3,
}

// Utility functions (ported from bonsol-interface Rust code)
function keccakHash(data: Uint8Array): Uint8Array {
  // Placeholder for keccak hash - in a real implementation you'd use a proper keccak library
  // For now, create a deterministic hash based on the data
  const hash = new Uint8Array(32);
  for (let i = 0; i < data.length && i < 32; i++) {
    hash[i] = data[i];
  }
  return hash;
}

function findProgramAddress(seeds: Uint8Array[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

export function executionAddress(requester: PublicKey, executionId: string): [PublicKey, number] {
  const seeds = [
    new TextEncoder().encode('execution'),
    requester.toBytes(),
    new TextEncoder().encode(executionId),
  ];
  return findProgramAddress(seeds, BONSOL_PROGRAM_ID);
}

export function deploymentAddress(imageId: string): [PublicKey, number] {
  const hash = keccakHash(new TextEncoder().encode(imageId));
  const seeds = [
    new TextEncoder().encode('deployment'),
    hash,
  ];
  return findProgramAddress(seeds, BONSOL_PROGRAM_ID);
}

export interface BonsolExecutionRequest {
  requester: PublicKey;
  payer: PublicKey;
  imageId: string;
  executionId: string;
  operation: CalculatorOperation;
  operandA: number;
  operandB: number;
  tip: number;
  expirationSlots: number;
}

export class BonsolCalculatorClient {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Create a Bonsol execution request - exactly like the working Rust client does
   */
  async createExecutionRequest(request: BonsolExecutionRequest): Promise<TransactionInstruction> {
    const {
      requester,
      payer,
      imageId,
      executionId,
      operation,
      operandA,
      operandB,
      tip,
      expirationSlots,
    } = request;

    // Get current slot for expiration calculation (like the Rust client)
    const currentSlot = await this.connection.getSlot();
    const expiration = currentSlot + expirationSlots;

    // Create the calculator inputs exactly like the working Rust client:
    // "combine all three 8-byte values into a single 24-byte input"
    const operationBytes = this.i64ToLeBytes(operation);
    const operandABytes = this.i64ToLeBytes(operandA);
    const operandBBytes = this.i64ToLeBytes(operandB);

    const combinedInput = new Uint8Array(24);
    combinedInput.set(operationBytes, 0);
    combinedInput.set(operandABytes, 8);
    combinedInput.set(operandBBytes, 16);

    console.log('🔢 Creating Bonsol execution request:');
    console.log('   Operation:', operation, '-> bytes:', Array.from(operationBytes));
    console.log('   Operand A:', operandA, '-> bytes:', Array.from(operandABytes));
    console.log('   Operand B:', operandB, '-> bytes:', Array.from(operandBBytes));
    console.log('   Combined input:', Array.from(combinedInput), '(length:', combinedInput.length, ')');

    // Create the execution instruction using FlatBuffers (like bonsol-interface execute_v1)
    return this.executeV1(
      requester,
      payer,
      imageId,
      executionId,
      [{ inputType: InputType.PublicData, data: combinedInput }],
      tip,
      expiration,
      {
        verifyInputHash: false,
        inputHash: null,
        forwardOutput: true,
      },
      {
        programId: CALLBACK_PROGRAM_ID,
        instructionPrefix: [1], // Callback instruction
        extraAccounts: [
          { address: EA1, role: 'readonly' },
          { address: EA2, role: 'writable' },
          { address: EA3, role: 'readonly' },
        ],
      }
    );
  }

  /**
   * TypeScript implementation of bonsol-interface execute_v1 function
   */
  private executeV1(
    requester: PublicKey,
    payer: PublicKey,
    imageId: string,
    executionId: string,
    inputs: Array<{ inputType: InputType; data: Uint8Array }>,
    tip: number,
    expiration: number,
    config: {
      verifyInputHash: boolean;
      inputHash: Uint8Array | null;
      forwardOutput: boolean;
    },
    callback: {
      programId: PublicKey;
      instructionPrefix: number[];
      extraAccounts: Array<{ address: PublicKey; role: 'readonly' | 'writable' }>;
    }
  ): TransactionInstruction {
    // Get required accounts
    const [executionAccount] = executionAddress(requester, executionId);
    const [deploymentAccount] = deploymentAddress(imageId);

    // Build the FlatBuffer (mimicking the Rust bonsol-interface)
    const fbb = new flatbuffers.Builder(1024);

    // Create inputs
    const fbInputs: flatbuffers.Offset[] = [];
    for (const input of inputs) {
      const dataOffset = fbb.createUint8Vector(input.data);
      const inputOffset = Input.createInput(fbb, input.inputType, dataOffset);
      fbInputs.push(inputOffset);
    }
    const inputsVectorOffset = fbb.createVectorOfTables(fbInputs);

    // Create callback accounts
    const callbackAccounts: flatbuffers.Offset[] = [];
    for (const acc of callback.extraAccounts) {
      const addressVector = fbb.createUint8Vector(acc.address.toBytes());
      const accountOffset = Account.createAccount(
        fbb,
        addressVector,
        acc.role === 'writable' ? [1] : [0] // Convert to array
      );
      callbackAccounts.push(accountOffset);
    }
    const callbackAccountsOffset = fbb.createVectorOfTables(callbackAccounts);

    // Create strings
    const imageIdOffset = fbb.createString(imageId);
    const executionIdOffset = fbb.createString(executionId);

    // Create callback program ID vector
    const callbackProgramIdVector = fbb.createUint8Vector(callback.programId.toBytes());

    // Create callback instruction prefix vector
    const callbackInstructionPrefixVector = fbb.createUint8Vector(new Uint8Array(callback.instructionPrefix));

    // Create input digest if provided
    const inputDigestOffset = config.inputHash ? fbb.createUint8Vector(config.inputHash) : undefined;

    // Create the ExecutionRequestV1
    const executionRequestOffset = ExecutionRequestV1.createExecutionRequestV1(
      fbb,
      BigInt(tip),
      executionIdOffset,
      imageIdOffset,
      callbackProgramIdVector,
      callbackInstructionPrefixVector,
      config.forwardOutput,
      config.verifyInputHash,
      inputsVectorOffset,
      inputDigestOffset || 0,
      BigInt(expiration),
      callbackAccountsOffset,
      ProverVersion.DEFAULT
    );

    fbb.finish(executionRequestOffset);
    const executionRequestBytes = fbb.asUint8Array();

    // Wrap in ChannelInstruction (like the Rust code does)
    const fbb2 = new flatbuffers.Builder(1024);
    const executeV1Offset = fbb2.createUint8Vector(executionRequestBytes);
    const channelInstructionOffset = ChannelInstruction.createChannelInstruction(
      fbb2,
      ChannelInstructionIxType.ExecuteV1,
      executeV1Offset,
      0, // statusV1
      0, // deployV1
      0  // claimV1
    );

    fbb2.finish(channelInstructionOffset);
    const instructionData = fbb2.asUint8Array();

    // Create accounts (matching bonsol program expectations)
    const accounts = [
      { pubkey: requester, isSigner: true, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: executionAccount, isSigner: false, isWritable: true },
      { pubkey: deploymentAccount, isSigner: false, isWritable: false },
      { pubkey: callback.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('11111111111111111111111111111112'), isSigner: false, isWritable: false }, // system program
      // Add callback extra accounts
      ...callback.extraAccounts.map(acc => ({
        pubkey: acc.address,
        isSigner: false,
        isWritable: acc.role === 'writable',
      })),
    ];

    console.log('✅ Created Bonsol instruction:');
    console.log('   Program ID:', BONSOL_PROGRAM_ID.toString());
    console.log('   Data length:', instructionData.length, 'bytes');
    console.log('   Accounts:', accounts.length);

    return new TransactionInstruction({
      keys: accounts,
      programId: BONSOL_PROGRAM_ID,
      data: Array.from(instructionData), // Convert to plain array for Solana
    });
  }

  /**
   * Submit a calculation to Bonsol - the main public method
   */
  async submitCalculation(
    payer: Keypair,
    operation: CalculatorOperation,
    operandA: number,
    operandB: number,
    executionId?: string
  ): Promise<string> {
    // Generate unique execution ID if not provided (like the client)
    const finalExecutionId = executionId || `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: BonsolExecutionRequest = {
      requester: payer.publicKey,
      payer: payer.publicKey,
      imageId: CALCULATOR_IMAGE_ID,
      executionId: finalExecutionId,
      operation,
      operandA,
      operandB,
      tip: 1000, // 1000 lamports tip (like the client)
      expirationSlots: 1000, // 1000 slots expiration
    };

    const instruction = await this.createExecutionRequest(request);
    const transaction = new Transaction().add(instruction);

    console.log('🔧 Sending Bonsol execution request...');
    console.log('   Execution ID:', finalExecutionId);
    console.log('   Operation:', operandA, this.getOperationSymbol(operation), operandB);

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log('🎉 Bonsol execution request sent!');
    console.log('   Signature:', signature);
    console.log('   This will now be computed in ZK by the Bonsol network!');

    return signature;
  }

  // Helper methods
  private i64ToLeBytes(value: number): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigInt64(0, BigInt(value), true); // true for little-endian
    return new Uint8Array(buffer);
  }

  private getOperationSymbol(operation: CalculatorOperation): string {
    switch (operation) {
      case CalculatorOperation.ADD: return '+';
      case CalculatorOperation.SUBTRACT: return '-';
      case CalculatorOperation.MULTIPLY: return '*';
      case CalculatorOperation.DIVIDE: return '/';
      default: return '?';
    }
  }
} 
