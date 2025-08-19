// Minimal, robuste, sans lib externe (Node 18+ => fetch natif)

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function safeJSON<T>(txt: string): T {
  // essaie JSON direct, sinon "répare" en récupérant le premier bloc {...}
  try { return JSON.parse(txt) as T; } catch {}
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = txt.slice(start, end + 1);
    try { return JSON.parse(slice) as T; } catch {}
  }
  throw new Error("Réponse IA non JSON");
}

export interface AIProvider {
  chatJSON<T = any>(userPrompt: string, systemPrompt?: string): Promise<T>;
}

export class DefaultAIProvider implements AIProvider {
  private mistralKey: string;
  private mistralModel: string;

  constructor() {
    this.mistralKey = process.env.MISTRAL_API_KEY || "";
    this.mistralModel = process.env.MISTRAL_MODEL || "mistral-small-latest";
    if (!this.mistralKey) {
      throw new Error("MISTRAL_API_KEY manquant");
    }
  }

  async chatJSON<T = any>(userPrompt: string, systemPrompt = "Réponds UNIQUEMENT en JSON valide."): Promise<T> {
    const msgs: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const text = await this.callMistral(msgs);
    return safeJSON<T>(text);
  }

  private async callMistral(messages: ChatMsg[]): Promise<string> {
    const temperature = Number(process.env.MISTRAL_TEMPERATURE ?? 0.2);
    const maxTokens = Number(process.env.MISTRAL_MAX_TOKENS ?? 3000);
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.mistralKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.mistralModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }
}

// ENV requis: MISTRAL_API_KEY
// Optionnels: MISTRAL_MODEL, MISTRAL_TEMPERATURE, MISTRAL_MAX_TOKENS
