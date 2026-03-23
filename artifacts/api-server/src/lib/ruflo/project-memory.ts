import { PgMemoryBackend, type MemoryEntry } from "./pg-memory-backend";

const MAX_CONTEXT_MEMORIES = 5;

export class ProjectMemory {
  private backend: PgMemoryBackend;

  constructor(backend: PgMemoryBackend) {
    this.backend = backend;
  }

  async recordPreference(projectId: number, preference: string, userId?: string): Promise<void> {
    await this.backend.store({
      projectId,
      userId,
      agentId: "system",
      content: preference,
      type: "context",
      metadata: { category: "preference" },
    });
  }

  async recordArchitectureDecision(projectId: number, decision: string, userId?: string): Promise<void> {
    await this.backend.store({
      projectId,
      userId,
      agentId: "system",
      content: decision,
      type: "context",
      metadata: { category: "architecture" },
    });
  }

  async recordTrajectory(
    projectId: number,
    data: {
      userMessage: string;
      taskType: string;
      model: string;
      outcome: string;
      latencyMs: number;
      creditsUsed: number;
      filesChanged: number;
    },
  ): Promise<void> {
    await this.backend.store({
      projectId,
      agentId: "system",
      content: JSON.stringify(data),
      type: "event",
      metadata: { category: "trajectory", taskType: data.taskType, model: data.model },
    });
  }

  async getRelevantContext(projectId: number, userMessage: string): Promise<string> {
    // Get recent preferences and architecture decisions
    const memories = await this.backend.query({
      projectId,
      type: "context",
      limit: MAX_CONTEXT_MEMORIES,
    });

    if (memories.length === 0) return "";

    const lines = memories.map((m) => `- ${m.content}`);
    return `\n\n<project_memory>\nRemembered context for this project:\n${lines.join("\n")}\n</project_memory>`;
  }

  async detectAndStorePreferences(projectId: number, userMessage: string, userId?: string): Promise<void> {
    const lower = userMessage.toLowerCase();

    // Detect framework/library preferences
    const frameworks = [
      { pattern: /use tailwind/i, pref: "User prefers Tailwind CSS for styling" },
      { pattern: /use react/i, pref: "User prefers React" },
      { pattern: /use vue/i, pref: "User prefers Vue" },
      { pattern: /use svelte/i, pref: "User prefers Svelte" },
      { pattern: /dark (theme|mode)/i, pref: "User prefers dark theme" },
      { pattern: /light (theme|mode)/i, pref: "User prefers light theme" },
      { pattern: /typescript/i, pref: "User prefers TypeScript over JavaScript" },
      { pattern: /no typescript|plain javascript/i, pref: "User prefers plain JavaScript" },
    ];

    for (const { pattern, pref } of frameworks) {
      if (pattern.test(userMessage)) {
        // Check if we already have this preference
        const existing = await this.backend.search(pref, projectId, 1);
        if (existing.length === 0) {
          await this.recordPreference(projectId, pref, userId);
        }
      }
    }
  }
}
