import { db, agentRunsTable } from "@workspace/db";
import type { LLMProvider, StreamEvent } from "../ai-providers";
import { calculateCredits } from "../ai-providers";
import { coordinatorPrompt, coderPrompt, reviewerPrompt, designerPrompt } from "./agent-prompts";
import type { TaskClassification } from "./task-classifier";
import type { PgMemoryBackend } from "./pg-memory-backend";

export interface SSEEvent {
  type: string;
  [key: string]: any;
}

interface SubTask {
  id: string;
  agent: "coder" | "reviewer" | "designer";
  description: string;
  files: string[];
  dependsOn: string[];
}

interface FileChange {
  filename: string;
  content: string;
  isEdit: boolean;
  editOld?: string;
  editNew?: string;
}

interface AgentResult {
  agentType: string;
  taskId: string;
  rawOutput: string;
  fileChanges: FileChange[];
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface SwarmResult {
  fileChanges: FileChange[];
  agentResults: AgentResult[];
  totalCredits: number;
  approved: boolean;
}

export class ProntoSwarmOrchestrator {
  private memoryBackend: PgMemoryBackend;
  private providers: LLMProvider[];

  constructor(memoryBackend: PgMemoryBackend, providers: LLMProvider[]) {
    this.memoryBackend = memoryBackend;
    this.providers = providers;
  }

  async executeSwarm(params: {
    userMessage: string;
    projectId: number;
    messageId: number;
    files: Array<{ filename: string; content: string }>;
    classification: TaskClassification;
    sseWriter: (event: SSEEvent) => void;
  }): Promise<SwarmResult> {
    const { userMessage, projectId, messageId, files, classification, sseWriter } = params;

    // Pick the best provider for coordinator (cheapest fast model)
    const coordProvider = this.pickProvider("coordinator");
    const coordModel = this.pickModel(coordProvider, "fast");
    const workerProvider = this.pickProvider("coder");
    const workerModel = this.pickModel(workerProvider, "quality");

    // Step 1: Coordinator decomposes the task
    sseWriter({ type: "swarm_status", phase: "decomposing", activeAgents: 1, completedTasks: 0, totalTasks: 0 });
    sseWriter({ type: "agent_spawned", agentId: "coordinator-1", agentType: "coordinator", role: "leader" });

    const fileList = files.map((f) => f.filename);
    const subtasks = await this.runCoordinator(coordProvider, coordModel, userMessage, fileList, projectId, messageId);

    if (!subtasks.length) {
      // Fallback: single coder task
      subtasks.push({
        id: "task-1",
        agent: "coder",
        description: userMessage,
        files: fileList.slice(0, 5),
        dependsOn: [],
      });
    }

    sseWriter({ type: "agent_completed", agentId: "coordinator-1", filesChanged: [] });
    sseWriter({ type: "swarm_status", phase: "executing", activeAgents: 0, completedTasks: 0, totalTasks: subtasks.length });

    // Step 2: Execute subtasks respecting dependencies
    const completed = new Set<string>();
    const results: AgentResult[] = [];
    const allFileChanges: FileChange[] = [];

    while (completed.size < subtasks.length) {
      // Find tasks whose dependencies are all met
      const ready = subtasks.filter(
        (t) => !completed.has(t.id) && t.dependsOn.every((d) => completed.has(d)),
      );

      if (ready.length === 0) {
        // Deadlock - force remaining tasks
        const remaining = subtasks.filter((t) => !completed.has(t.id));
        ready.push(...remaining);
      }

      // Execute ready tasks in parallel
      const promises = ready.map(async (task) => {
        const agentId = `${task.agent}-${task.id}`;
        sseWriter({ type: "agent_spawned", agentId, agentType: task.agent, role: "worker" });
        sseWriter({ type: "agent_progress", agentId, status: "running", message: task.description });

        const fileContext = files
          .filter((f) => task.files.includes(f.filename) || task.files.length === 0)
          .map((f) => `--- ${f.filename} ---\n${f.content}`)
          .join("\n\n");

        let result: AgentResult;
        if (task.agent === "reviewer") {
          result = await this.runReviewer(workerProvider, coordModel, fileContext, allFileChanges, projectId, messageId);
        } else if (task.agent === "designer") {
          result = await this.runWorker(workerProvider, workerModel, task, fileContext, "designer", projectId, messageId);
        } else {
          result = await this.runWorker(workerProvider, workerModel, task, fileContext, "coder", projectId, messageId);
        }

        result.taskId = task.id;
        sseWriter({ type: "agent_completed", agentId, filesChanged: result.fileChanges.map((f) => f.filename) });

        return result;
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        results.push(r);
        allFileChanges.push(...r.fileChanges);
        completed.add(r.taskId);
      }

      sseWriter({
        type: "swarm_status",
        phase: "executing",
        activeAgents: 0,
        completedTasks: completed.size,
        totalTasks: subtasks.length,
      });
    }

    // Calculate total credits
    let totalCredits = 0;
    for (const r of results) {
      totalCredits += calculateCredits(r.model, r.inputTokens, r.outputTokens);
    }

    // Check if reviewer approved
    const reviewResult = results.find((r) => r.agentType === "reviewer");
    const approved = !reviewResult || reviewResult.rawOutput.trim() === "APPROVED";

    sseWriter({ type: "swarm_status", phase: "complete", activeAgents: 0, completedTasks: subtasks.length, totalTasks: subtasks.length });

    return {
      fileChanges: allFileChanges,
      agentResults: results,
      totalCredits,
      approved,
    };
  }

  private async runCoordinator(
    provider: LLMProvider,
    model: string,
    userMessage: string,
    fileList: string[],
    projectId: number,
    messageId: number,
  ): Promise<SubTask[]> {
    const system = coordinatorPrompt(fileList);
    let output = "";

    const startedAt = new Date();
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of provider.streamChat({
      model,
      system,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2000,
    })) {
      if (event.type === "text_delta") output += event.content;
      if (event.type === "done") {
        inputTokens = event.usage?.input ?? 0;
        outputTokens = event.usage?.output ?? 0;
      }
    }

    // Log the agent run
    await db.insert(agentRunsTable).values({
      projectId,
      messageId,
      agentType: "coordinator",
      model,
      inputTokens,
      outputTokens,
      costUsd: 0,
      status: "completed",
      resultSummary: output.slice(0, 500),
      startedAt,
      completedAt: new Date(),
    }).catch(() => {});

    try {
      // Strip markdown fences if present
      const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleaned) as SubTask[];
    } catch {
      return [];
    }
  }

  private async runWorker(
    provider: LLMProvider,
    model: string,
    task: SubTask,
    fileContext: string,
    agentType: "coder" | "designer",
    projectId: number,
    messageId: number,
  ): Promise<AgentResult> {
    const system = agentType === "designer" ? designerPrompt(fileContext) : coderPrompt(fileContext);
    let output = "";
    const startedAt = new Date();
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of provider.streamChat({
      model,
      system,
      messages: [{ role: "user", content: task.description }],
      maxTokens: 16000,
    })) {
      if (event.type === "text_delta") output += event.content;
      if (event.type === "done") {
        inputTokens = event.usage?.input ?? 0;
        outputTokens = event.usage?.output ?? 0;
      }
    }

    await db.insert(agentRunsTable).values({
      projectId,
      messageId,
      agentType,
      model,
      inputTokens,
      outputTokens,
      costUsd: 0,
      status: "completed",
      resultSummary: `Files: ${task.files.join(", ")}`,
      startedAt,
      completedAt: new Date(),
    }).catch(() => {});

    const fileChanges = this.parseFileChanges(output);

    return { agentType, taskId: task.id, rawOutput: output, fileChanges, inputTokens, outputTokens, model };
  }

  private async runReviewer(
    provider: LLMProvider,
    model: string,
    fileContext: string,
    proposedChanges: FileChange[],
    projectId: number,
    messageId: number,
  ): Promise<AgentResult> {
    const system = reviewerPrompt();
    const changesDescription = proposedChanges
      .map((c) => `File: ${c.filename}\n${c.isEdit ? `Edit: ${c.editOld} -> ${c.editNew}` : `Full content (${c.content.length} chars)`}`)
      .join("\n\n");

    let output = "";
    const startedAt = new Date();
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of provider.streamChat({
      model,
      system,
      messages: [{ role: "user", content: `Original files:\n${fileContext}\n\nProposed changes:\n${changesDescription}` }],
      maxTokens: 2000,
    })) {
      if (event.type === "text_delta") output += event.content;
      if (event.type === "done") {
        inputTokens = event.usage?.input ?? 0;
        outputTokens = event.usage?.output ?? 0;
      }
    }

    await db.insert(agentRunsTable).values({
      projectId,
      messageId,
      agentType: "reviewer",
      model,
      inputTokens,
      outputTokens,
      costUsd: 0,
      status: "completed",
      resultSummary: output.slice(0, 200),
      startedAt,
      completedAt: new Date(),
    }).catch(() => {});

    return { agentType: "reviewer", taskId: "", rawOutput: output, fileChanges: [], inputTokens, outputTokens, model };
  }

  private parseFileChanges(output: string): FileChange[] {
    const changes: FileChange[] = [];

    // Parse <file name="...">...</file>
    const fileRegex = /<file\s+name="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    while ((match = fileRegex.exec(output))) {
      changes.push({ filename: match[1], content: match[2].trim(), isEdit: false });
    }

    // Parse <edit file="..."><old>...</old><new>...</new></edit>
    const editRegex = /<edit\s+file="([^"]+)">\s*<old>([\s\S]*?)<\/old>\s*<new>([\s\S]*?)<\/new>\s*<\/edit>/g;
    while ((match = editRegex.exec(output))) {
      changes.push({ filename: match[1], content: "", isEdit: true, editOld: match[2], editNew: match[3] });
    }

    return changes;
  }

  private pickProvider(role: string): LLMProvider {
    // For coordinator/reviewer: prefer cheapest provider
    // For coder/designer: prefer highest quality
    if (role === "coordinator" || role === "reviewer") {
      // Prefer Google (cheapest) > OpenAI mini > Anthropic Haiku
      return (
        this.providers.find((p) => p.id === "google") ||
        this.providers.find((p) => p.id === "openai") ||
        this.providers[0]
      );
    }
    // For quality work: prefer Anthropic > OpenAI > Google
    return (
      this.providers.find((p) => p.id === "anthropic") ||
      this.providers.find((p) => p.id === "openai") ||
      this.providers[0]
    );
  }

  private pickModel(provider: LLMProvider, tier: "fast" | "quality"): string {
    const models = provider.listModels();
    if (tier === "fast") {
      // Pick the cheapest model
      return models[models.length - 1] || models[0];
    }
    // Pick the best model
    return models[0];
  }
}
