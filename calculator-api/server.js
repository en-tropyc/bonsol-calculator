const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the working Rust client
const CLIENT_PATH = path.join(__dirname, '..', 'client');

// Store execution requests and their status
const executions = new Map();

// Helper function to run the Rust client
function runBonsolClient(operation, operandA, operandB, executionId) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Running Bonsol client: ${operandA} ${operation} ${operandB}`);
    
    const args = [
      'run',
      '--',
      '--method', 'direct-bonsol',
      '--operation', operation,
      '--operand-a', operandA.toString(),
      '--operand-b', operandB.toString(),
      '--execution-id', executionId,
      '--airdrop'
    ];

    const client = spawn('cargo', args, { 
      cwd: CLIENT_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    client.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('📤 Client output:', output.trim());
    });

    client.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.error('🚨 Client error:', error.trim());
    });

    client.on('close', (code) => {
      console.log(`✅ Client process exited with code ${code}`);
      
      if (code === 0) {
        // Parse the transaction signature from stdout
        const signatureMatch = stdout.match(/Signature: ([A-Za-z0-9]+)/);
        const signature = signatureMatch ? signatureMatch[1] : null;
        
        resolve({
          success: true,
          signature,
          output: stdout,
          executionId,
          operation,
          operandA,
          operandB
        });
      } else {
        reject({
          success: false,
          error: stderr || 'Unknown error',
          code
        });
      }
    });

    client.on('error', (error) => {
      console.error('💥 Failed to start client process:', error);
      reject({
        success: false,
        error: error.message
      });
    });
  });
}

// Routes

// POST /calculate - Submit a calculation to Bonsol
app.post('/calculate', async (req, res) => {
  try {
    const { operation, operandA, operandB, executionId } = req.body;

    // Validate input
    if (!operation || operandA === undefined || operandB === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: operation, operandA, operandB'
      });
    }

    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!validOperations.includes(operation.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      });
    }

    // Generate execution ID if not provided
    const finalExecutionId = executionId || `calc_${Date.now()}_${uuidv4().slice(0, 8)}`;

    console.log(`🧮 Received calculation request: ${operandA} ${operation} ${operandB}`);
    console.log(`🆔 Execution ID: ${finalExecutionId}`);

    // Store the execution request
    executions.set(finalExecutionId, {
      status: 'submitted',
      operation,
      operandA,
      operandB,
      executionId: finalExecutionId,
      timestamp: new Date().toISOString(),
      signature: null,
      result: null
    });

    // Run the Rust client
    try {
      const result = await runBonsolClient(operation, operandA, operandB, finalExecutionId);
      
      // Update execution status
      executions.set(finalExecutionId, {
        ...executions.get(finalExecutionId),
        status: 'completed',
        signature: result.signature,
        bonsolOutput: result.output
      });

      res.json({
        success: true,
        executionId: finalExecutionId,
        signature: result.signature,
        message: 'Bonsol execution request submitted successfully!',
        operation: `${operandA} ${operation} ${operandB}`,
        note: 'The ZK computation is now being processed by the Bonsol network'
      });

    } catch (clientError) {
      console.error('❌ Client execution failed:', clientError);
      
      // Update execution status
      executions.set(finalExecutionId, {
        ...executions.get(finalExecutionId),
        status: 'failed',
        error: clientError.error || 'Unknown error'
      });

      res.status(500).json({
        success: false,
        executionId: finalExecutionId,
        error: 'Failed to submit to Bonsol network',
        details: clientError.error
      });
    }

  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /execution/:id - Get execution status
app.get('/execution/:id', (req, res) => {
  const { id } = req.params;
  const execution = executions.get(id);

  if (!execution) {
    return res.status(404).json({
      error: 'Execution not found'
    });
  }

  res.json(execution);
});

// GET /executions - List all executions
app.get('/executions', (req, res) => {
  const allExecutions = Array.from(executions.values()).map(exec => ({
    executionId: exec.executionId,
    status: exec.status,
    operation: `${exec.operandA} ${exec.operation} ${exec.operandB}`,
    timestamp: exec.timestamp,
    signature: exec.signature
  }));

  res.json({
    executions: allExecutions,
    total: allExecutions.length
  });
});

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'calculator-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET / - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Bonsol Calculator API',
    version: '1.0.0',
    description: 'REST API wrapper for the Bonsol Calculator Rust client',
    endpoints: {
      'POST /calculate': 'Submit a calculation to Bonsol network',
      'GET /execution/:id': 'Get execution status by ID',
      'GET /executions': 'List all executions',
      'GET /health': 'Health check'
    },
    example: {
      method: 'POST',
      url: '/calculate',
      body: {
        operation: 'multiply',
        operandA: 15,
        operandB: 25,
        executionId: 'optional-custom-id'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Calculator API server running on port ${PORT}`);
  console.log(`📋 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/calculate`);
  console.log(`   GET  http://localhost:${PORT}/executions`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`🔗 Rust client path: ${CLIENT_PATH}`);
}); 
