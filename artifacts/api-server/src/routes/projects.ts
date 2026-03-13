import { Router, type IRouter } from "express";
import { eq, desc, max } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  projectsTable,
  projectFilesTable,
  projectMessagesTable,
  projectVersionsTable,
  creditLedgerTable,
  templatesTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  SendProjectMessageBody,
  UpdateProjectFileBody,
} from "@workspace/api-zod";
import { getAIClient } from "../lib/ai-client";

const FREE_CREDITS = 50000;
const CREDITS_PER_REQUEST = 5000;

async function ensureFreeCredits(userId: string) {
  const existing = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  if (existing.length === 0) {
    await db.insert(creditLedgerTable).values({
      userId,
      amount: FREE_CREDITS,
      type: "signup_bonus",
      description: "Free credits on signup",
    });
  }
}

async function getUserBalance(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  return result.reduce((sum, r) => sum + r.amount, 0);
}

async function saveVersion(projectId: number) {
  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  const lastVersion = await db
    .select({ max: max(projectVersionsTable.versionNumber) })
    .from(projectVersionsTable)
    .where(eq(projectVersionsTable.projectId, projectId));

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

  for (const f of starterFiles) {
    await db.insert(projectFilesTable).values({ projectId: project.id, ...f });
  }

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

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, id))
    .orderBy(projectFilesTable.filename);

  const messages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, id))
    .orderBy(projectMessagesTable.createdAt);

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
  if (userId) {
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

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  const existingMessages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, projectId))
    .orderBy(projectMessagesTable.createdAt);

  const filesContext = files
    .map((f) => `=== ${f.filename} (${f.language}) ===\n${f.content}`)
    .join("\n\n");

  const systemPrompt = `You are an AI coding assistant similar to Replit Agent. You help users build web applications by modifying their project files.

Current project: "${project.name}"
Description: "${project.description}"

Current files:
${filesContext}

When the user asks you to make changes, you MUST:
1. First write a brief explanation of what you'll do
2. Then output the updated file(s) using this EXACT format for each file:

<file name="filename.ext">
file content here
</file>

Rules:
- Always output complete file contents, not partial diffs
- You can create new files or update existing ones
- Supported file types: html, css, js, ts, json, etc.
- The main file is index.html which is shown in the preview
- Make the code functional and well-styled
- Use inline CSS and JS in HTML when possible for simplicity`;

  const chatMessages: { role: "user" | "assistant"; content: string }[] =
    existingMessages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  chatMessages.push({ role: "user", content: body.content });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const anthropic = await getAIClient();
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullResponse += chunk;
        res.write(
          `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
        );
      }
    }

    const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    const updatedFiles: { filename: string; content: string; language: string }[] = [];

    while ((match = fileRegex.exec(fullResponse)) !== null) {
      const filename = match[1];
      const content = match[2].trim();
      const ext = filename.split(".").pop() ?? "txt";
      const langMap: Record<string, string> = {
        html: "html",
        css: "css",
        js: "javascript",
        ts: "typescript",
        json: "json",
        md: "markdown",
        py: "python",
      };
      const language = langMap[ext] ?? ext;

      const existingFile = files.find((f) => f.filename === filename);
      if (existingFile) {
        await db
          .update(projectFilesTable)
          .set({ content, language, updatedAt: new Date() })
          .where(eq(projectFilesTable.id, existingFile.id));

        const [updated] = await db
          .select()
          .from(projectFilesTable)
          .where(eq(projectFilesTable.id, existingFile.id));
        updatedFiles.push({ filename, content, language });

        res.write(
          `data: ${JSON.stringify({
            type: "file_update",
            fileId: existingFile.id,
            filename,
            content,
            language,
          })}\n\n`
        );
      } else {
        const [newFile] = await db
          .insert(projectFilesTable)
          .values({ projectId, filename, content, language })
          .returning();

        updatedFiles.push({ filename, content, language });

        res.write(
          `data: ${JSON.stringify({
            type: "file_update",
            fileId: newFile.id,
            filename,
            content,
            language,
            isNew: true,
          })}\n\n`
        );
      }
    }

    await db
      .update(projectsTable)
      .set({ updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));

    const cleanedResponse = fullResponse
      .replace(/<file name="[^"]+">[\s\S]*?<\/file>/g, "")
      .trim();

    await db.insert(projectMessagesTable).values({
      projectId,
      role: "assistant",
      content: fullResponse,
    });

    await saveVersion(projectId);

    if (userId) {
      await db.insert(creditLedgerTable).values({
        userId,
        amount: -CREDITS_PER_REQUEST,
        type: "ai_generation",
        description: `AI generation for project ${projectId}`,
      });
    }

    const newBalance = userId ? await getUserBalance(userId) : null;
    res.write(`data: ${JSON.stringify({ type: "done", creditsRemaining: newBalance })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Streaming error:", err);
    res.write(
      `data: ${JSON.stringify({ type: "error", error: "An error occurred" })}\n\n`
    );
    res.end();
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

  await db
    .update(projectFilesTable)
    .set({ content: body.content, updatedAt: new Date() })
    .where(eq(projectFilesTable.id, fileId));

  const [updated] = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.id, fileId));

  res.json(updated);
});

export default router;
