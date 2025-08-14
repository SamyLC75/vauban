// src/services/ai.provider.ts
export interface AIProvider {
  chatJSON<T = unknown>(prompt: string, sys?: string): Promise<T>;
}
