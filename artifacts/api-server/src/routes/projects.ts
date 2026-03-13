import { Router, type IRouter } from "express";
import { eq, desc, max, sum } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  projectFilesTable,
  projectMessagesTable,
  projectVersionsTable,
  creditLedgerTable,
  templatesTable,
  usersTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  SendProjectMessageBody,
  UpdateProjectFileBody,
} from "@workspace/api-zod";
import { getAIClient } from "../lib/ai-client";
import { isUnlimitedUser } from "../lib/admin";
import { ensureFreeCredits, triggerAutoTopup } from "./credits";

const CREDITS_PER_REQUEST = 5000;

async function getUserBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(creditLedgerTable.amount) })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  return Number(row?.total ?? 0);
}

async function saveVersion(projectId: number) {
  const [files, lastVersion] = await Promise.all([
    db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, projectId)),
    db.select({ max: max(projectVersionsTable.versionNumber) }).from(projectVersionsTable).where(eq(projectVersionsTable.projectId, projectId)),
  ]);

  const nextVersion = (lastVersion[0]?.max ?? 0) + 1;

  await db.insert(projectVersionsTable).values({
    projectId,
    versionNumber: nextVersion,
    label: `Auto-save v${nextVersion}`,
    filesSnapshot: files.map((f) => ({
      filename: f.filename,
      content: f.content,
      language: f.language,
    })),
  });
}

const router: IRouter = Router();

router.get("/projects", async (req, res) => {
  const userId = req.isAuthenticated() ? req.user.id : null;
  const projects = userId
    ? await db.select().from(projectsTable).where(eq(projectsTable.userId, userId)).orderBy(desc(projectsTable.updatedAt))
    : await db.select().from(projectsTable).orderBy(desc(projectsTable.updatedAt));
  res.json(projects);
});

router.post("/projects", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const userId = req.isAuthenticated() ? req.user.id : null;

  if (userId) await ensureFreeCredits(userId);

  const [project] = await db
    .insert(projectsTable)
    .values({ name: body.name, description: body.description, userId: userId ?? undefined })
    .returning();

  let starterFiles: { filename: string; content: string; language: string }[] = [];

  const templateId = (req.body as any).templateId;
  if (templateId) {
    const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, parseInt(templateId)));
    if (template) starterFiles = template.files;
  }

  if (starterFiles.length === 0) {
    starterFiles = [{
      filename: "index.html",
      content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${body.name}</title>\n  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}h1{color:#111827;}</style>\n</head>\n<body>\n  <h1>Welcome to ${body.name}</h1>\n  <p>Start chatting to build your app!</p>\n</body>\n</html>`,
      language: "html",
    }];
  }

  await db.insert(projectFilesTable).values(
    starterFiles.map((f) => ({ projectId: project.id, ...f }))
  );

  res.status(201).json(project);
});

router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [files, messages] = await Promise.all([
    db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, id)).orderBy(projectFilesTable.filename),
    db.select().from(projectMessagesTable).where(eq(projectMessagesTable.projectId, id)).orderBy(projectMessagesTable.createdAt),
  ]);

  res.json({ ...project, files, messages });
});

router.delete("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.status(204).send();
});

router.get("/projects/:id/files", async (req, res) => {
  const id = parseInt(req.params.id);
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, id))
    .orderBy(projectFilesTable.filename);
  res.json(files);
});

router.get("/projects/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const messages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, id))
    .orderBy(projectMessagesTable.createdAt);
  res.json(messages);
});

router.post("/projects/:id/messages", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const body = SendProjectMessageBody.parse(req.body);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const userId = req.isAuthenticated() ? req.user.id : null;
  const userEmail = req.isAuthenticated() ? req.user.email : null;
  const unlimited = isUnlimitedUser(userEmail);

  if (userId && !unlimited) {
    await ensureFreeCredits(userId);
    const balance = await getUserBalance(userId);
    if (balance < CREDITS_PER_REQUEST) {
      res.status(402).json({ error: "Insufficient credits. Please add more credits to continue." });
      return;
    }
  }

  await db.insert(projectMessagesTable).values({
    projectId,
    role: "user",
    content: body.content,
  });

  const [files, existingMessages] = await Promise.all([
    db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, projectId)),
    db.select().from(projectMessagesTable).where(eq(projectMessagesTable.projectId, projectId)).orderBy(projectMessagesTable.createdAt),
  ]);

  const filesContext = files
    .map((f) => `=== ${f.filename} (${f.language}) ===\n${f.content}`)
    .join("\n\n");

  const systemPrompt = `You are an AI coding assistant that builds web applications by modifying project files.

Current project: "${project.name}"
Description: "${project.description}"

Current files:
${filesContext}

When the user asks you to make changes:
1. Write a brief 1-2 sentence explanation of what you'll do
2. Output ALL updated file(s) using this EXACT format:

<file name="filename.ext">
file content here
</file>

CRITICAL RULES:
- Always output COMPLETE file contents — never truncate or use placeholders like "// rest of code"
- Keep HTML concise: avoid unnecessary comments, blank lines, and verbose attributes
- Combine CSS and JS inline inside index.html to minimise file count
- Use efficient, compact CSS (shorthand properties, no redundant rules)
- Never apologise or explain that you ran out of space — just write complete files
- If a feature requires many lines, simplify it rather than truncating`;


  const chatMessages: { role: "user" | "assistant"; content: string }[] =
    existingMessages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  chatMessages.push({ role: "user", content: body.content });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const langMap: Record<string, string> = {
    html: "html", css: "css", js: "javascript", ts: "typescript",
    json: "json", md: "markdown", py: "python",
  };

  function getLanguage(filename: string) {
    const ext = filename.split(".").pop() ?? "txt";
    return langMap[ext] ?? ext;
  }

  async function flushFile(filename: string, rawContent: string) {
    const content = rawContent.trim();
    if (!content) return;
    const language = getLanguage(filename);
    const existingFile = files.find((f) => f.filename === filename);
    if (existingFile) {
      await db.update(projectFilesTable)
        .set({ content, language, updatedAt: new Date() })
        .where(eq(projectFilesTable.id, existingFile.id));
      res.write(`data: ${JSON.stringify({ type: "file_update", fileId: existingFile.id, filename, content, language })}\n\n`);
    } else {
      const [newFile] = await db.insert(projectFilesTable)
        .values({ projectId, filename, content, language })
        .returning();
      res.write(`data: ${JSON.stringify({ type: "file_update", fileId: newFile.id, filename, content, language, isNew: true })}\n\n`);
    }
  }

  let fullResponse = "";
  let streamBuf = "";
  let inFile = false;
  let currentFilename = "";
  let fileBuf = "";

  async function processStreamBuf() {
    while (true) {
      if (!inFile) {
        const openMatch = streamBuf.match(/<file name="([^"]+)">/);
        if (openMatch) {
          const idx = streamBuf.indexOf(openMatch[0]);
          currentFilename = openMatch[1];
          fileBuf = "";
          streamBuf = streamBuf.slice(idx + openMatch[0].length);
          inFile = true;
        } else {
          if (streamBuf.length > 200) streamBuf = streamBuf.slice(-100);
          break;
        }
      } else {
        const closeIdx = streamBuf.indexOf("</file>");
        if (closeIdx !== -1) {
          fileBuf += streamBuf.slice(0, closeIdx);
          streamBuf = streamBuf.slice(closeIdx + 7);
          inFile = false;
          await flushFile(currentFilename, fileBuf);
          fileBuf = "";
        } else {
          const tail = "</file>";
          let splitAt = streamBuf.length;
          for (let i = 1; i < tail.length; i++) {
            if (streamBuf.endsWith(tail.slice(0, i))) {
              splitAt = streamBuf.length - i;
              break;
            }
          }
          fileBuf += streamBuf.slice(0, splitAt);
          streamBuf = streamBuf.slice(splitAt);
          break;
        }
      }
    }
  }

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(": keep-alive\n\n");
  }, 15000);

  try {
    const anthropic = await getAIClient();
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const chunk = event.delta.text;
        fullResponse += chunk;
        streamBuf += chunk;
        res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
        await processStreamBuf();
      }
    }

    if (inFile && fileBuf.trim()) {
      await flushFile(currentFilename, fileBuf);
    }

    await db.update(projectsTable).set({ updatedAt: new Date() }).where(eq(projectsTable.id, projectId));

    await db.insert(projectMessagesTable).values({ projectId, role: "assistant", content: fullResponse });

    await saveVersion(projectId);

    if (userId && !unlimited) {
      await db.insert(creditLedgerTable).values({
        userId, amount: -CREDITS_PER_REQUEST, type: "ai_generation",
        description: `AI generation for project ${projectId}`,
      });

      const postBalance = await getUserBalance(userId);
      if (postBalance <= 0) {
        const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (userRow?.stripeCustomerId) {
          triggerAutoTopup(userId, userRow.stripeCustomerId).catch((e) =>
            console.error("Auto top-up error:", e)
          );
        }
      }
    }

    const newBalance = unlimited ? null : (userId ? await getUserBalance(userId) : null);
    res.write(`data: ${JSON.stringify({ type: "done", creditsRemaining: newBalance, unlimited })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Streaming error:", err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Generation failed. Please try again." })}\n\n`);
      res.end();
    }
  } finally {
    clearInterval(keepAlive);
  }
});

router.get("/projects/:id/preview", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  const indexFile = files.find((f) => f.filename === "index.html") ?? files[0];
  if (!indexFile) {
    res.status(404).send("<html><body><p>No files found</p></body></html>");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(indexFile.content);
});

router.put("/projects/:projectId/files/:fileId", async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const fileId = parseInt(req.params.fileId);
  const body = UpdateProjectFileBody.parse(req.body);

  const [file] = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.id, fileId));

  if (!file || file.projectId !== projectId) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const [updated] = await db
    .update(projectFilesTable)
    .set({ content: body.content, updatedAt: new Date() })
    .where(eq(projectFilesTable.id, fileId))
    .returning();

  res.json(updated);
});

export default router;
