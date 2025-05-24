import React, { useState, useEffect } from 'react';
import { BonsolApiClient, CalculationRequest, CalculationResponse, ExecutionStatus } from './bonsol-api-client.ts';

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
  subtitle: {
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '20px',
    fontSize: '16px',
  },
  calculator: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
    padding: '30px',
    marginBottom: '20px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
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
  executionInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px',
    fontSize: '14px',
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

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export const BonsolCalculatorApp: React.FC = () => {
  // State management
  const [operandA, setOperandA] = useState<number>(15);
  const [operandB, setOperandB] = useState<number>(25);
  const [operation, setOperation] = useState<Operation>('multiply');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [status, setStatus] = useState<string>('Ready to submit ZK calculations');
  const [apiHealth, setApiHealth] = useState<string>('Checking...');
  const [executions, setExecutions] = useState<ExecutionStatus[]>([]);

  // API client
  const [apiClient] = useState(() => new BonsolApiClient());

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
    loadExecutions();
  }, []);

  const checkApiHealth = async () => {
    try {
      const health = await apiClient.checkHealth();
      setApiHealth(`✅ API ${health.status} (uptime: ${Math.round(health.uptime)}s)`);
    } catch (error) {
      setApiHealth('❌ API not available');
      setStatus('Error: Calculator API is not running. Please start the API server.');
    }
  };

  const loadExecutions = async () => {
    try {
      const data = await apiClient.getAllExecutions();
      setExecutions(data.executions);
    } catch (error) {
      console.warn('Could not load execution history:', error);
    }
  };

  const performCalculation = async () => {
    setIsCalculating(true);
    setStatus('🔧 Submitting calculation to Bonsol ZK network...');
    setResult(null);

    try {
      const request: CalculationRequest = {
        operation,
        operandA,
        operandB,
      };

      console.log('🧮 Submitting calculation:', `${operandA} ${operation} ${operandB}`);
      
      const response = await apiClient.submitCalculation(request);
      
      setResult(response);
      setIsCalculating(false);
      
      if (response.success) {
        setStatus('🎉 ZK execution request submitted successfully!');
      } else {
        setStatus(`❌ Error: ${response.error}`);
      }

      // Reload execution history
      await loadExecutions();

    } catch (error) {
      console.error('Calculation error:', error);
      setStatus(`❌ Calculation failed: ${error}`);
      setIsCalculating(false);
    }
  };

  const getOperationSymbol = (op: Operation): string => {
    switch (op) {
      case 'add': return '+';
      case 'subtract': return '-';
      case 'multiply': return '×';
      case 'divide': return '÷';
      default: return '?';
    }
  };

  const getStatusStyle = () => {
    if (status.includes('failed') || status.includes('Error') || status.includes('❌')) {
      return { ...styles.status, backgroundColor: '#f8d7da', color: '#721c24' };
    }
    if (status.includes('🎉') || status.includes('success') || status.includes('✅')) {
      return { ...styles.status, backgroundColor: '#d4edda', color: '#155724' };
    }
    return { ...styles.status, backgroundColor: '#fff3cd', color: '#856404' };
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🧮 Bonsol ZK Calculator</h1>
      <p style={styles.subtitle}>
        Zero-Knowledge calculations powered by RISC0 and Solana
      </p>
      
      {/* API Status */}
      <div style={getStatusStyle()}>
        <strong>API Status:</strong> {apiHealth}
      </div>

      {/* Calculator Interface */}
      <div style={styles.calculator}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
          Submit Calculation to ZK Network
        </h3>
        
        <div style={styles.inputGroup}>
          <input
            type="number"
            value={operandA}
            onChange={(e) => setOperandA(Number(e.target.value))}
            style={styles.input}
            placeholder="First number"
          />
          
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as Operation)}
            style={styles.select}
          >
            <option value="add">+ Add</option>
            <option value="subtract">- Subtract</option>
            <option value="multiply">× Multiply</option>
            <option value="divide">÷ Divide</option>
          </select>
          
          <input
            type="number"
            value={operandB}
            onChange={(e) => setOperandB(Number(e.target.value))}
            style={styles.input}
            placeholder="Second number"
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={performCalculation}
            disabled={isCalculating || apiHealth.includes('❌')}
            style={{
              ...styles.button,
              ...(isCalculating || apiHealth.includes('❌') ? styles.buttonDisabled : {}),
            }}
          >
            {isCalculating ? '⏳ Submitting...' : '🚀 Submit to ZK Network'}
          </button>
        </div>

        <div style={getStatusStyle()}>
          <strong>Status:</strong> {status}
        </div>

        {/* Calculation Preview */}
        <div style={{ textAlign: 'center', fontSize: '18px', margin: '20px 0' }}>
          <strong>
            {operandA} {getOperationSymbol(operation)} {operandB} = ?
          </strong>
          <br />
          <small style={{ color: '#666' }}>
            (Result will be computed by ZK proof)
          </small>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div style={styles.executionInfo}>
          <h4>🎯 Execution Request Details</h4>
          <p><strong>Execution ID:</strong> {result.executionId}</p>
          <p><strong>Operation:</strong> {result.operation}</p>
          {result.signature && (
            <p><strong>Transaction:</strong> 
              <a 
                href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                {result.signature.slice(0, 8)}...{result.signature.slice(-8)}
              </a>
            </p>
          )}
          <p><strong>Note:</strong> {result.note}</p>
        </div>
      )}

      {/* Execution History */}
      {executions.length > 0 && (
        <div style={styles.history}>
          <h3>📊 Recent ZK Executions</h3>
          {executions.slice(0, 5).map((exec, index) => (
            <div key={exec.executionId} style={styles.historyItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>{exec.operation}</strong>
                  <span style={{ 
                    marginLeft: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '12px',
                    backgroundColor: exec.status === 'completed' ? '#d4edda' : 
                                   exec.status === 'failed' ? '#f8d7da' : '#fff3cd',
                    color: exec.status === 'completed' ? '#155724' : 
                           exec.status === 'failed' ? '#721c24' : '#856404'
                  }}>
                    {exec.status}
                  </span>
                </span>
                <small>{new Date(exec.timestamp).toLocaleTimeString()}</small>
              </div>
              <small style={{ color: '#666' }}>
                ID: {exec.executionId}
                {exec.signature && (
                  <span> | TX: {exec.signature.slice(0, 8)}...{exec.signature.slice(-8)}</span>
                )}
              </small>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#666', fontSize: '14px' }}>
        <p>
          ⚡ Powered by <strong>Bonsol</strong> | 🔐 Zero-Knowledge Proofs | ⛓️ Solana Blockchain
        </p>
      </div>
    </div>
  );
};

export default BonsolCalculatorApp; 
