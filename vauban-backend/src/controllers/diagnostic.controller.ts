import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { MistralProvider } from "../services/mistral.provider";

const aiProvider = new MistralProvider();

/**
 * GET /api/diag/ia
 * Tests the connectivity to the AI provider
 */
export const testIaConnectivity = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Test with a simple ping message
    const prompt = 'Respond with a JSON object containing a "message" field saying "pong"';
    const systemPrompt = 'You are a helpful assistant.';
    const response = await aiProvider.chatJSON<{message: string}>(prompt, systemPrompt);

    const responseTime = Date.now() - startTime;
    
    // Check if we got a valid response
    if (response?.message?.toLowerCase().includes('pong')) {
      return res.status(200).json({
        status: 'ok',
        provider: 'mistral',
        model: 'mistral-small-latest',
        response_time_ms: responseTime,
        message: 'Successfully connected to AI service',
        response: response
      });
    }
    
    // If we got a response but it's not what we expected
    return res.status(502).json({
      status: 'error',
      provider: 'mistral',
      response_time_ms: responseTime,
      message: 'Received unexpected response from AI service',
      response: response
    });
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('AI connectivity check failed:', error);
    
    // Extract relevant error information
    const statusCode = error.response?.status || 502;
    const errorMessage = error.message || 'Failed to connect to AI service';
    const errorDetails = error.response?.data || error.stack;
    
    return res.status(statusCode).json({
      status: 'error',
      provider: 'mistral',
      response_time_ms: responseTime,
      message: errorMessage,
      error: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/diag/health
 * Basic health check endpoint
 */
export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vauban-backend',
    environment: process.env.NODE_ENV || 'development'
  });
};
