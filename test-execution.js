const http = require('http');

console.log('🧪 Testing Bonsol Calculator Execution Request...\n');

// Test data for calculation
const testCalculation = {
  operation: 'multiply',
  operandA: 15,
  operandB: 25
};

function submitCalculation(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/calculate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testExecution() {
  try {
    console.log(`📝 Submitting calculation: ${testCalculation.operandA} ${testCalculation.operation} ${testCalculation.operandB}`);
    
    const result = await submitCalculation(testCalculation);
    
    console.log(`\n✅ Request submitted successfully!`);
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`🎯 Execution Details:`);
    console.log(`   - Execution ID: ${result.data.executionId || 'N/A'}`);
    console.log(`   - Success: ${result.data.success || false}`);
    console.log(`   - Message: ${result.data.message || 'No message'}`);
    console.log(`   - Operation: ${result.data.operation || 'N/A'}`);
    
    if (result.data.signature) {
      console.log(`   - Transaction: ${result.data.signature}`);
      console.log(`   - Explorer: https://explorer.solana.com/tx/${result.data.signature}?cluster=devnet`);
    }
    
    console.log(`\n📋 Raw Response:`);
    console.log(JSON.stringify(result.data, null, 2));
    
    if (result.data.success) {
      console.log(`\n🎉 Execution request created successfully!`);
      console.log(`💡 The ZK computation will be processed by the Bonsol network.`);
      console.log(`⏳ Check the frontend at http://localhost:3000 to see status updates.`);
    } else {
      console.log(`\n⚠️  Execution request failed: ${result.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error(`❌ Error submitting calculation:`, error.message);
  }
}

// Run the test
testExecution(); 
