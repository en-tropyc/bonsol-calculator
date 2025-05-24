import React, { useState, useEffect } from 'react';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { CalculatorClient, CalculatorOperation, CalculationRecord } from './calculator-client';

// Styles for the calculator
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center' as const,
    color: '#333',
    marginBottom: '30px',
  },
  calculator: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
    padding: '30px',
    marginBottom: '20px',
  },
  input: {
    width: '100px',
    padding: '10px',
    fontSize: '16px',
    textAlign: 'center' as const,
    border: '1px solid #ccc',
    borderRadius: '5px',
    margin: '0 10px',
  },
  select: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    margin: '0 10px',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '5px',
    cursor: 'pointer',
    margin: '10px',
  },
  result: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    margin: '20px 0',
    padding: '15px',
    backgroundColor: '#e7f3ff',
    border: '1px solid #0066cc',
    borderRadius: '5px',
  },
  status: {
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '10px',
  },
  history: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
    padding: '20px',
  },
  historyItem: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
  },
};

export const CalculatorApp: React.FC = () => {
  // State management
  const [operandA, setOperandA] = useState<number>(10);
  const [operandB, setOperandB] = useState<number>(5);
  const [operation, setOperation] = useState<CalculatorOperation>(CalculatorOperation.ADD);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [result, setResult] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('Ready to calculate');
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Solana connection and client
  const [connection] = useState(() => new Connection(clusterApiUrl('devnet')));
  const [wallet] = useState(() => Keypair.generate()); // In real app, use wallet adapter
  const [calculatorClient] = useState(() => new CalculatorClient(connection));

  // Initialize the calculator backend when component mounts
  useEffect(() => {
    initializeCalculator();
  }, []);

  const initializeCalculator = async () => {
    try {
      setStatus('Initializing calculator backend...');
      
      // Check if already initialized
      const state = await calculatorClient.getHistory(wallet.publicKey);
      if (state?.isInitialized) {
        setIsInitialized(true);
        setStatus('Calculator backend ready!');
        return;
      }

      // Request airdrop for devnet
      try {
        await connection.requestAirdrop(wallet.publicKey, 2000000000); // 2 SOL
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for confirmation
      } catch (e) {
        console.log('Airdrop failed, continuing anyway...');
      }

      // Initialize the backend
      await calculatorClient.initialize(wallet);
      setIsInitialized(true);
      setStatus('Calculator backend initialized successfully!');
    } catch (error) {
      console.error('Initialization error:', error);
      setStatus(`Initialization failed: ${error}`);
    }
  };

  const performCalculation = async () => {
    if (!isInitialized) {
      setStatus('Please wait for initialization to complete');
      return;
    }

    setIsCalculating(true);
    setStatus('Submitting calculation to Bonsol ZK network...');
    setResult(null);

    try {
      // Submit calculation to Solana program
      const signature = await calculatorClient.submitCalculation(
        wallet,
        operation,
        operandA,
        operandB
      );

      setStatus(`Calculation submitted! Transaction: ${signature.slice(0, 8)}...`);

      // Start watching for results
      const unwatch = await calculatorClient.watchCalculation(
        wallet.publicKey,
        (state) => {
          if (state.lastCalculation?.isComplete && state.lastCalculation.result !== undefined) {
            setResult(state.lastCalculation.result);
            setStatus('✅ Calculation completed by ZK proof!');
            setIsCalculating(false);
            
            // Add to history
            setHistory(prev => [state.lastCalculation!, ...prev]);
            
            // Stop watching
            unwatch();
          }
        }
      );

      // Timeout after 60 seconds
      setTimeout(() => {
        if (isCalculating) {
          setStatus('Calculation timed out. Please try again.');
          setIsCalculating(false);
          unwatch();
        }
      }, 60000);

    } catch (error) {
      console.error('Calculation error:', error);
      setStatus(`Calculation failed: ${error}`);
      setIsCalculating(false);
    }
  };

  const getOperationSymbol = (op: CalculatorOperation): string => {
    return CalculatorClient.getOperationSymbol(op);
  };

  const getStatusStyle = () => {
    if (status.includes('failed') || status.includes('error')) {
      return { ...styles.status, backgroundColor: '#f8d7da', color: '#721c24' };
    }
    if (status.includes('✅') || status.includes('success')) {
      return { ...styles.status, backgroundColor: '#d4edda', color: '#155724' };
    }
    return { ...styles.status, backgroundColor: '#fff3cd', color: '#856404' };
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🧮 Bonsol ZK Calculator</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Zero-Knowledge Proof calculations on Solana using Bonsol
      </p>

      {/* Status */}
      <div style={getStatusStyle()}>
        <strong>Status:</strong> {status}
      </div>

      {/* Calculator Interface */}
      <div style={styles.calculator}>
        <h3>Calculate with Zero-Knowledge Proofs</h3>
        
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <input
            type="number"
            value={operandA}
            onChange={(e) => setOperandA(Number(e.target.value))}
            style={styles.input}
            disabled={isCalculating}
          />
          
          <select
            value={operation}
            onChange={(e) => setOperation(Number(e.target.value) as CalculatorOperation)}
            style={styles.select}
            disabled={isCalculating}
          >
            <option value={CalculatorOperation.ADD}>+ Add</option>
            <option value={CalculatorOperation.SUBTRACT}>- Subtract</option>
            <option value={CalculatorOperation.MULTIPLY}>× Multiply</option>
            <option value={CalculatorOperation.DIVIDE}>÷ Divide</option>
          </select>
          
          <input
            type="number"
            value={operandB}
            onChange={(e) => setOperandB(Number(e.target.value))}
            style={styles.input}
            disabled={isCalculating}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={performCalculation}
            disabled={!isInitialized || isCalculating}
            style={{
              ...styles.button,
              backgroundColor: isCalculating ? '#6c757d' : '#007bff',
              cursor: (!isInitialized || isCalculating) ? 'not-allowed' : 'pointer',
            }}
          >
            {isCalculating ? '🔄 Computing ZK Proof...' : '🧮 Calculate with ZK'}
          </button>
        </div>

        {/* Result Display */}
        {result !== null && (
          <div style={styles.result}>
            {operandA} {getOperationSymbol(operation)} {operandB} = <strong>{result}</strong>
            <br />
            <small style={{ fontSize: '14px', color: '#666' }}>
              ✅ Verified by Zero-Knowledge Proof on Solana
            </small>
          </div>
        )}
      </div>

      {/* Calculation History */}
      <div style={styles.history}>
        <h3>📊 Calculation History</h3>
        {history.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No calculations yet</p>
        ) : (
          <div>
            {history.map((calc, index) => (
              <div key={index} style={styles.historyItem}>
                <strong>{CalculatorClient.formatCalculation(calc)}</strong>
                <br />
                <small style={{ color: '#666' }}>
                  {new Date(calc.timestamp * 1000).toLocaleString()} | 
                  ID: {calc.executionId}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical Info */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f1f3f4', borderRadius: '10px' }}>
        <h4>🔧 Technical Details</h4>
        <ul style={{ fontSize: '14px', color: '#666' }}>
          <li><strong>Wallet:</strong> {wallet.publicKey.toBase58().slice(0, 8)}...</li>
          <li><strong>Network:</strong> Solana Devnet</li>
          <li><strong>ZK Network:</strong> Bonsol</li>
          <li><strong>Program:</strong> Calculator Backend</li>
          <li><strong>Privacy:</strong> Calculations verified with zero-knowledge proofs</li>
        </ul>
      </div>
    </div>
  );
};

export default CalculatorApp; 
