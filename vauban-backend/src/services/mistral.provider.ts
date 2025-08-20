import axios, { AxiosError, AxiosResponse } from 'axios';
import { AIProvider } from "./ai.provider";

type MistralMessage = { role: "system" | "user" | "assistant"; content: string };
type MistralChoice = { index: number; message: { role: string; content: string }; finish_reason: string };
type MistralResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MistralChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const DEFAULT_TIMEOUT_MS = Number(process.env.MISTRAL_TIMEOUT_MS ?? 60000);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

export class MistralProvider implements AIProvider {
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(
    private apiKey = process.env.MISTRAL_API_KEY!,
    private model = process.env.MISTRAL_MODEL || "mistral-large-latest"
  ) {
    if (!this.apiKey) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }
    this.timeoutMs = Number(process.env.MISTRAL_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    this.maxTokens = Number(process.env.MISTRAL_MAX_TOKENS ?? 3000);
    this.temperature = Number(process.env.MISTRAL_TEMPERATURE ?? 0.2);
  }

  async chatJSON<T = unknown>(prompt: string, sys = "Tu réponds en JSON strict."): Promise<T> {
    const messages: MistralMessage[] = [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ];
    
    try {
      return await this.callMistral<T>(messages);
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      
      // Log detailed error for server-side debugging
      console.error('[Mistral] API error', { 
        message: error.message,
        status,
        model: this.model,
        promptLength: prompt.length,
        data: typeof data === 'string' ? data.slice(0, 400) : data
      });
      
      // Re-throw with status code for proper error handling upstream
      const err = new Error(error.message || 'Mistral API error');
      (err as any).statusCode = status || 502;
      throw err;
    }
  }

  private async callMistral<T>(messages: MistralMessage[], attempt = 1): Promise<T> {
    try {
      const { data }: AxiosResponse<MistralResponse> = await axios.post(
        "https://api.mistral.ai/v1/chat/completions",
        {
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: { type: "json_object" },
        },
        {
          headers: { 
            Authorization: `Bearer ${this.apiKey}`, 
            'Content-Type': 'application/json' 
          },
          timeout: this.timeoutMs,
          timeoutErrorMessage: `Mistral API timeout (${this.timeoutMs}ms)`,
        }
      );

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Mistral API');
      }

      return JSON.parse(content) as T;
    } catch (error) {
      if (this.shouldRetry(error as Error, attempt)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return this.callMistral<T>(messages, attempt + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= MAX_RETRIES) return false;
    
    // Retry on network errors, timeouts, and 5xx errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return !status || (status >= 500 && status < 600);
    }
    
    // Retry on timeouts
    return /timeout|ETIMEDOUT|ECONNABORTED/i.test(error.message);
  }
}
