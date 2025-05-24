// Simple API client for the Bonsol Calculator REST API
export interface CalculationRequest {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  operandA: number;
  operandB: number;
  executionId?: string;
}

export interface CalculationResponse {
  success: boolean;
  executionId: string;
  signature?: string;
  message?: string;
  operation?: string;
  note?: string;
  error?: string;
  details?: string;
}

export interface ExecutionStatus {
  executionId: string;
  status: 'submitted' | 'completed' | 'failed';
  operation: string;
  operandA: number;
  operandB: number;
  timestamp: string;
  signature?: string;
  bonsolOutput?: string;
  error?: string;
}

export class BonsolApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Submit a calculation to the Bonsol network via our REST API
   */
  async submitCalculation(request: CalculationRequest): Promise<CalculationResponse> {
    try {
      console.log('🔧 Submitting calculation to Bonsol API:', request);
      
      const response = await fetch(`${this.baseUrl}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Bonsol API response:', data);
      return data;

    } catch (error) {
      console.error('❌ Error calling Bonsol API:', error);
      throw error;
    }
  }

  /**
   * Get the status of an execution by ID
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/execution/${executionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting execution status:', error);
      throw error;
    }
  }

  /**
   * Get all executions
   */
  async getAllExecutions(): Promise<{ executions: ExecutionStatus[], total: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/executions`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting executions:', error);
      throw error;
    }
  }

  /**
   * Check if the API is healthy
   */
  async checkHealth(): Promise<{ status: string, service: string, timestamp: string, uptime: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error checking API health:', error);
      throw error;
    }
  }
} 
