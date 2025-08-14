import axios, { AxiosResponse } from 'axios';
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

export class MistralProvider implements AIProvider {
  constructor(
    private apiKey = process.env.MISTRAL_API_KEY!,
    private model = process.env.MISTRAL_MODEL || "mistral-large-latest"
  ) {}

  async chatJSON<T = unknown>(prompt: string, sys = "Tu réponds en JSON strict."): Promise<T> {
    if (!this.apiKey) throw new Error("MISTRAL_API_KEY absente");

    const body = {
      model: this.model,
      temperature: Number(process.env.MISTRAL_TEMPERATURE ?? 0.4),
      max_tokens: Number(process.env.MISTRAL_MAX_TOKENS ?? 3000),
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ] as MistralMessage[],
      response_format: { type: "json_object" as const },
    };

    try {
      const { data }: AxiosResponse<MistralResponse> = await axios.post(
        "https://api.mistral.ai/v1/chat/completions",
        body,
        {
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Réponse Mistral vide");

      return JSON.parse(content) as T;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Erreur Mistral API (${error.response?.status}): ${error.message}`);
      }
      throw new Error(`Erreur Mistral: ${(error as Error).message}`);
    }
  }
}
