import Anthropic from "@anthropic-ai/sdk";
import { db, appSettingsTable } from "@workspace/db";
import { getCachedAppSettings } from "./ai-client";

// ---- Shared types ----

export interface StreamEvent {
  type: "text_delta" | "thinking_delta" | "done" | "error";
  content?: string;
  usage?: { input: number; output: number };
  model?: string;
  stopReason?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

export interface StreamChatParams {
  model: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  thinking?: { type: "enabled"; budgetTokens: number };
}

export interface LLMProvider {
  id: string;
  displayName: string;
  streamChat(params: StreamChatParams): AsyncGenerator<StreamEvent>;
  listModels(): string[];
}

// ---- Anthropic Provider ----

export class AnthropicProvider implements LLMProvider {
  id = "anthropic";
  displayName = "Anthropic";
  private client: Anthropic;

  constructor(client: Anthropic) {
    this.client = client;
  }

  listModels() {
    return ["claude-sonnet-4-20250514", "claude-haiku-4-20250414"];
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<StreamEvent> {
    const reqParams: any = {
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
    };
    if (params.thinking) {
      reqParams.thinking = params.thinking;
    }

    const stream = this.client.messages.stream(reqParams);

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const delta = event.delta as any;
        if (delta.type === "text_delta") {
          yield { type: "text_delta", content: delta.text };
        } else if (delta.type === "thinking_delta") {
          yield { type: "thinking_delta", content: delta.thinking };
        }
      }
    }

    const final = await stream.finalMessage();
    yield {
      type: "done",
      usage: {
        input: final.usage?.input_tokens || 0,
        output: final.usage?.output_tokens || 0,
      },
      model: params.model,
      stopReason: final.stop_reason || "end_turn",
    };
  }
}

// ---- OpenAI Provider ----

export class OpenAIProvider implements LLMProvider {
  id = "openai";
  displayName = "OpenAI";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  listModels() {
    return ["gpt-4o", "gpt-4o-mini", "o3-mini"];
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<StreamEvent> {
    const messages: any[] = [
      { role: "system", content: params.system },
      ...params.messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages,
        max_completion_tokens: params.maxTokens,
        stream: true,
      }),
    });

    if (!resp.ok) {
      yield { type: "error", content: `OpenAI API error: ${resp.status}` };
      return;
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: "text_delta", content: delta.content };
          }
          if (data.usage) {
            inputTokens = data.usage.prompt_tokens || 0;
            outputTokens = data.usage.completion_tokens || 0;
          }
        } catch {}
      }
    }

    yield {
      type: "done",
      usage: { input: inputTokens, output: outputTokens },
      model: params.model,
      stopReason: "end_turn",
    };
  }
}

// ---- Google Gemini Provider ----

export class GoogleProvider implements LLMProvider {
  id = "google";
  displayName = "Google";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  listModels() {
    return ["gemini-2.5-flash", "gemini-2.5-pro"];
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<StreamEvent> {
    const model = params.model;
    const contents = params.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: params.system }] },
        generationConfig: { maxOutputTokens: params.maxTokens },
      }),
    });

    if (!resp.ok) {
      yield { type: "error", content: `Google API error: ${resp.status}` };
      return;
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield { type: "text_delta", content: text };
          }
          if (data.usageMetadata) {
            inputTokens = data.usageMetadata.promptTokenCount || 0;
            outputTokens = data.usageMetadata.candidatesTokenCount || 0;
          }
        } catch {}
      }
    }

    yield {
      type: "done",
      usage: { input: inputTokens, output: outputTokens },
      model: params.model,
      stopReason: "end_turn",
    };
  }
}

// ---- Model pricing (credits per 1M tokens, with 10x markup) ----

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-sonnet-4-20250514": { input: 30_000, output: 150_000 },
  "claude-haiku-4-20250414": { input: 8_000, output: 40_000 },
  // OpenAI
  "gpt-4o": { input: 25_000, output: 100_000 },
  "gpt-4o-mini": { input: 1_500, output: 6_000 },
  "o3-mini": { input: 11_000, output: 44_000 },
  // Google
  "gemini-2.5-flash": { input: 1_500, output: 6_000 },
  "gemini-2.5-pro": { input: 12_500, output: 50_000 },
};

export function calculateCredits(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["claude-sonnet-4-20250514"];
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return Math.max(500, Math.ceil(cost));
}

// ---- Provider factory ----

export async function getAvailableProviders(): Promise<LLMProvider[]> {
  const providers: LLMProvider[] = [];

  const settings = await getCachedAppSettings();

  // Anthropic (always available via own key or replit)
  if (settings?.provider === "own" && settings.ownApiKey) {
    providers.push(new AnthropicProvider(new Anthropic({ apiKey: settings.ownApiKey })));
  } else {
    try {
      const { anthropic: replitAnthropic } = await import("@workspace/integrations-anthropic-ai");
      providers.push(new AnthropicProvider(replitAnthropic));
    } catch {
      // replit integration not available
    }
  }

  // OpenAI
  if (settings?.openaiApiKey) {
    providers.push(new OpenAIProvider(settings.openaiApiKey));
  }

  // Google
  if (settings?.googleApiKey) {
    providers.push(new GoogleProvider(settings.googleApiKey));
  }

  return providers;
}

export function getProvider(providers: LLMProvider[], id: string): LLMProvider | undefined {
  return providers.find((p) => p.id === id);
}
