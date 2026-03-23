import { db, orchestrationMemoryTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface MemoryEntry {
  id?: number;
  projectId?: number;
  userId?: string;
  agentId?: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface MemoryQuery {
  projectId?: number;
  agentId?: string;
  type?: string;
  timeRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export class PgMemoryBackend {
  async store(entry: MemoryEntry): Promise<number> {
    const [row] = await db
      .insert(orchestrationMemoryTable)
      .values({
        projectId: entry.projectId ?? null,
        userId: entry.userId ?? null,
        agentId: entry.agentId ?? null,
        content: entry.content,
        type: entry.type,
        metadata: entry.metadata ?? {},
      })
      .returning({ id: orchestrationMemoryTable.id });
    return row.id;
  }

  async retrieve(id: number): Promise<MemoryEntry | null> {
    const [row] = await db
      .select()
      .from(orchestrationMemoryTable)
      .where(eq(orchestrationMemoryTable.id, id))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      projectId: row.projectId ?? undefined,
      userId: row.userId ?? undefined,
      agentId: row.agentId ?? undefined,
      content: row.content,
      type: row.type,
      metadata: (row.metadata as Record<string, any>) ?? {},
      createdAt: row.createdAt,
    };
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    const conditions = [];

    if (q.projectId != null) {
      conditions.push(eq(orchestrationMemoryTable.projectId, q.projectId));
    }
    if (q.agentId) {
      conditions.push(eq(orchestrationMemoryTable.agentId, q.agentId));
    }
    if (q.type) {
      conditions.push(eq(orchestrationMemoryTable.type, q.type));
    }
    if (q.timeRange) {
      conditions.push(gte(orchestrationMemoryTable.createdAt, q.timeRange.start));
      conditions.push(lte(orchestrationMemoryTable.createdAt, q.timeRange.end));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(orchestrationMemoryTable)
      .where(where)
      .orderBy(desc(orchestrationMemoryTable.createdAt))
      .limit(q.limit ?? 50)
      .offset(q.offset ?? 0);

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId ?? undefined,
      userId: row.userId ?? undefined,
      agentId: row.agentId ?? undefined,
      content: row.content,
      type: row.type,
      metadata: (row.metadata as Record<string, any>) ?? {},
      createdAt: row.createdAt,
    }));
  }

  async search(text: string, projectId?: number, limit = 10): Promise<MemoryEntry[]> {
    // Full-text search fallback (no pgvector dependency)
    const conditions = [sql`${orchestrationMemoryTable.content} ILIKE ${'%' + text + '%'}`];
    if (projectId != null) {
      conditions.push(eq(orchestrationMemoryTable.projectId, projectId));
    }

    const rows = await db
      .select()
      .from(orchestrationMemoryTable)
      .where(and(...conditions))
      .orderBy(desc(orchestrationMemoryTable.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId ?? undefined,
      userId: row.userId ?? undefined,
      agentId: row.agentId ?? undefined,
      content: row.content,
      type: row.type,
      metadata: (row.metadata as Record<string, any>) ?? {},
      createdAt: row.createdAt,
    }));
  }

  async delete(id: number): Promise<void> {
    await db.delete(orchestrationMemoryTable).where(eq(orchestrationMemoryTable.id, id));
  }

  async clearProject(projectId: number): Promise<number> {
    const result = await db
      .delete(orchestrationMemoryTable)
      .where(eq(orchestrationMemoryTable.projectId, projectId));
    return (result as any).rowCount ?? 0;
  }

  async clearAgent(agentId: string): Promise<number> {
    const result = await db
      .delete(orchestrationMemoryTable)
      .where(eq(orchestrationMemoryTable.agentId, agentId));
    return (result as any).rowCount ?? 0;
  }
}
