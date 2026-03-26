import { db } from "@workspace/db";
import { orchestrationMemoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";

export type MemoryType = 'preference' | 'pattern' | 'feedback' | 'style' | 'context';

export interface MemoryEntry {
  id?: number;
  projectId: number | null;
  userId: string | null;
  agentId: string;
  content: string;
  type: MemoryType;
  metadata: Record<string, any>;
  createdAt?: Date;
}

export async function extractMemories(
  client: Anthropic,
  userMessage: string,
  assistantMessage: string,
  projectId: number,
  userId: string | null,
): Promise<MemoryEntry[]> {
  const prompt = `Analyze this conversation turn and extract user preferences, design choices, or patterns worth remembering.

USER: ${userMessage.slice(0, 1000)}
ASSISTANT: ${assistantMessage.slice(0, 1000)}

Extract ONLY genuinely useful memories. Respond with JSON array (no markdown):
[{"content": "what to remember", "type": "preference|pattern|feedback|style|context", "metadata": {"category": "design|code|behavior|tech"}}]

If nothing worth remembering, respond with: []`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    return parsed.map((m: any) => ({
      projectId,
      userId,
      agentId: 'auto-memory',
      content: String(m.content || ''),
      type: (['preference', 'pattern', 'feedback', 'style', 'context'].includes(m.type) ? m.type : 'context') as MemoryType,
      metadata: m.metadata || {},
    }));
  } catch {
    return [];
  }
}

export async function storeMemories(memories: MemoryEntry[]): Promise<void> {
  if (memories.length === 0) return;
  for (const mem of memories) {
    await db.insert(orchestrationMemoryTable).values({
      projectId: mem.projectId,
      userId: mem.userId,
      agentId: mem.agentId,
      content: mem.content,
      type: mem.type,
      metadata: mem.metadata,
    });
  }
}

export async function recallMemories(
  userId: string | null,
  projectId: number | null,
  limit = 20,
): Promise<MemoryEntry[]> {
  if (!userId) return [];

  const rows = await db
    .select()
    .from(orchestrationMemoryTable)
    .where(eq(orchestrationMemoryTable.userId, userId))
    .orderBy(desc(orchestrationMemoryTable.createdAt))
    .limit(limit * 2);

  const seen = new Set<string>();
  const unique: MemoryEntry[] = [];
  for (const row of rows) {
    const key = row.content.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      agentId: row.agentId || 'auto-memory',
      content: row.content,
      type: (row.type || 'context') as MemoryType,
      metadata: (row.metadata as Record<string, any>) || {},
      createdAt: row.createdAt ?? undefined,
    });
    if (unique.length >= limit) break;
  }
  return unique;
}

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return '';
  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    if (!grouped[m.type]) grouped[m.type] = [];
    grouped[m.type].push(m.content);
  }
  let result = '\n\n[USER MEMORY — learned from previous interactions]\n';
  for (const [type, items] of Object.entries(grouped)) {
    result += `\n${type.toUpperCase()}:\n`;
    for (const item of items) result += `- ${item}\n`;
  }
  result += '\nApply these preferences automatically unless the user says otherwise.\n';
  return result;
}

export async function forgetMemory(memoryId: number): Promise<void> {
  await db.delete(orchestrationMemoryTable).where(eq(orchestrationMemoryTable.id, memoryId));
}

export async function forgetAllMemories(userId: string): Promise<void> {
  await db.delete(orchestrationMemoryTable).where(eq(orchestrationMemoryTable.userId, userId));
}
