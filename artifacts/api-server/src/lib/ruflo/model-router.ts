import { db, modelRoutingLogTable } from "@workspace/db";
import type { LLMProvider } from "../ai-providers";
import type { TaskClassification } from "./task-classifier";
import type { PgMemoryBackend } from "./pg-memory-backend";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export interface RouteDecision {
  provider: LLMProvider;
  model: string;
  thinkingBudget: number;
  confidence: number;
}

// Cost tiers: lower = cheaper
const MODEL_COST_TIER: Record<string, number> = {
  "gemini-2.5-flash": 1,
  "gpt-4o-mini": 2,
  "claude-haiku-4-20250414": 3,
  "o3-mini": 4,
  "gpt-4o": 5,
  "gemini-2.5-pro": 6,
  "claude-sonnet-4-20250514": 7,
};

// Quality tiers: higher = better quality
const MODEL_QUALITY_TIER: Record<string, number> = {
  "gemini-2.5-flash": 3,
  "gpt-4o-mini": 3,
  "claude-haiku-4-20250414": 4,
  "o3-mini": 5,
  "gpt-4o": 6,
  "gemini-2.5-pro": 7,
  "claude-sonnet-4-20250514": 8,
};

export class ModelRouter {
  private memoryBackend: PgMemoryBackend;

  constructor(memoryBackend: PgMemoryBackend) {
    this.memoryBackend = memoryBackend;
  }

  async route(
    classification: TaskClassification,
    providers: LLMProvider[],
  ): Promise<RouteDecision> {
    // Collect all available models across providers
    const candidates: Array<{ provider: LLMProvider; model: string }> = [];
    for (const p of providers) {
      for (const m of p.listModels()) {
        candidates.push({ provider: p, model: m });
      }
    }

    if (candidates.length === 0) {
      throw new Error("No AI providers available");
    }

    // Score each candidate
    let best = candidates[0];
    let bestScore = -Infinity;

    for (const c of candidates) {
      const score = this.scoreCandidate(c.model, classification);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    // Determine thinking budget
    const thinkingBudget = this.getThinkingBudget(classification, best.model);

    // Check past performance for this task type
    const confidence = await this.getConfidence(classification.taskType, best.model);

    // Log the decision
    const promptHash = crypto
      .createHash("sha256")
      .update(classification.taskType + classification.complexity)
      .digest("hex")
      .slice(0, 16);

    await db.insert(modelRoutingLogTable).values({
      promptHash,
      taskType: classification.taskType,
      chosenModel: best.model,
      chosenProvider: best.provider.id,
      confidence,
    }).catch(() => {});

    return {
      provider: best.provider,
      model: best.model,
      thinkingBudget,
      confidence,
    };
  }

  private scoreCandidate(model: string, classification: TaskClassification): number {
    const cost = MODEL_COST_TIER[model] ?? 5;
    const quality = MODEL_QUALITY_TIER[model] ?? 5;

    // Weight quality vs cost based on complexity
    let qualityWeight: number;
    let costWeight: number;

    switch (classification.complexity) {
      case "trivial":
        qualityWeight = 0.2;
        costWeight = 0.8;
        break;
      case "simple":
        qualityWeight = 0.4;
        costWeight = 0.6;
        break;
      case "moderate":
        qualityWeight = 0.6;
        costWeight = 0.4;
        break;
      case "complex":
        qualityWeight = 0.85;
        costWeight = 0.15;
        break;
    }

    // Design tasks need higher quality
    if (classification.taskType === "design" || classification.taskType === "multi-file") {
      qualityWeight = Math.min(1, qualityWeight + 0.15);
      costWeight = 1 - qualityWeight;
    }

    // Attachments (images/PDFs) require vision -> only Anthropic Sonnet or GPT-4o
    if (classification.hasAttachments) {
      const visionModels = ["claude-sonnet-4-20250514", "gpt-4o", "gemini-2.5-pro", "gemini-2.5-flash"];
      if (!visionModels.includes(model)) return -100;
    }

    // Thinking support: only Anthropic
    if (classification.complexity === "complex" && !model.startsWith("claude-")) {
      qualityWeight *= 0.8; // penalize non-Anthropic for complex tasks (no thinking)
    }

    return quality * qualityWeight - cost * costWeight;
  }

  private getThinkingBudget(classification: TaskClassification, model: string): number {
    // Only Anthropic supports thinking
    if (!model.startsWith("claude-")) return 0;
    // Haiku doesn't support thinking
    if (model.includes("haiku")) return 0;

    switch (classification.complexity) {
      case "trivial":
        return 0;
      case "simple":
        return 5000;
      case "moderate":
        return 8000;
      case "complex":
        return 12000;
    }
  }

  private async getConfidence(taskType: string, model: string): Promise<number> {
    try {
      const recentLogs = await db
        .select()
        .from(modelRoutingLogTable)
        .where(eq(modelRoutingLogTable.chosenModel, model))
        .orderBy(desc(modelRoutingLogTable.createdAt))
        .limit(20);

      if (recentLogs.length < 3) return 0.5; // not enough data

      const successes = recentLogs.filter((l) => l.outcome === "success").length;
      return successes / recentLogs.length;
    } catch {
      return 0.5;
    }
  }

  async recordOutcome(
    model: string,
    provider: string,
    outcome: "success" | "failure" | "partial",
    latencyMs: number,
  ): Promise<void> {
    // Update the most recent routing log for this model
    try {
      const [recent] = await db
        .select()
        .from(modelRoutingLogTable)
        .where(eq(modelRoutingLogTable.chosenModel, model))
        .orderBy(desc(modelRoutingLogTable.createdAt))
        .limit(1);

      if (recent && !recent.outcome) {
        await db
          .update(modelRoutingLogTable)
          .set({ outcome, latencyMs })
          .where(eq(modelRoutingLogTable.id, recent.id));
      }
    } catch {}
  }
}
