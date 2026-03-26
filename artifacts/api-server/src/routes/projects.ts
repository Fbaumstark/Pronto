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
  aiUsageLogTable,
  appSettingsTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  SendProjectMessageBody,
  UpdateProjectFileBody,
} from "@workspace/api-zod";
import { getAIClient } from "../lib/ai-client";
import { getAvailableProviders, type LLMProvider } from "../lib/ai-providers";
import type Anthropic from "@anthropic-ai/sdk";
import { isUnlimitedUser } from "../lib/admin";
import { ensureFreeCredits, triggerAutoTopup } from "./credits";
import { classifyTask } from "../lib/ruflo/task-classifier";
import { ModelRouter } from "../lib/ruflo/model-router";
import { ProntoSwarmOrchestrator } from "../lib/ruflo/pronto-swarm";
import { PgMemoryBackend } from "../lib/ruflo/pg-memory-backend";
import { runComputerUseLoop } from "../lib/computer-use";

const MIN_CREDITS_TO_START = 500;

const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-5":          { input: 3.00,  output: 15.00 },
  "claude-sonnet-4":            { input: 3.00,  output: 15.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00,  output: 15.00 },
  "claude-3-5-sonnet-20240620": { input: 3.00,  output: 15.00 },
  "claude-haiku-4-5":           { input: 0.80,  output: 4.00  },
  "claude-haiku-4":             { input: 0.80,  output: 4.00  },
  "claude-3-5-haiku-20241022":  { input: 0.80,  output: 4.00  },
  "claude-3-opus-20240229":     { input: 15.00, output: 75.00 },
  "claude-3-haiku-20240307":    { input: 0.25,  output: 1.25  },
};

const DEFAULT_PRICING = { input: 3.00, output: 15.00 };
const CREDIT_VALUE_USD = 10 / 500_000;
const MARKUP = 10;

function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = ANTHROPIC_PRICING[model] ?? DEFAULT_PRICING;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function calculateCredits(model: string, inputTokens: number, outputTokens: number): number {
  const costUsd = calculateCostUsd(model, inputTokens, outputTokens);
  return Math.max(Math.ceil((costUsd * MARKUP) / CREDIT_VALUE_USD), MIN_CREDITS_TO_START);
}

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

/** Summarise old conversation turns with Haiku so they fit in a tiny budget. */
async function summarizeOldMessages(
  anthropic: Anthropic,
  messages: { role: string; content: string | any }[],
  projectName: string,
): Promise<string> {
  const digest = messages
    .map((m) => {
      const text = typeof m.content === "string" ? m.content.slice(0, 400) : "[file/image content]";
      return `${m.role === "user" ? "User" : "AI"}: ${text}`;
    })
    .join("\n\n");

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Summarise this "${projectName}" app-building session in 3–5 concise sentences. Cover: what was built, bugs fixed, key design decisions. Be extremely brief.\n\n${digest}`,
      }],
    });
    return (res.content[0] as any)?.text ?? "Earlier conversation history available.";
  } catch {
    return "Earlier conversation history available.";
  }
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
  const creatorEmail = req.isAuthenticated() ? req.user.email : null;

  if (userId && !isUnlimitedUser(creatorEmail)) await ensureFreeCredits(userId);

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
    if (balance < MIN_CREDITS_TO_START) {
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

  const focusedFile = body.focusFileId ? files.find((f) => f.id === body.focusFileId) : null;
  const isSurgical = !!(focusedFile && files.length > 0);

  // Files that should never be sent to the model — they waste tokens and add no value.
  const SKIP_FILENAME_PATTERNS = [
    /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/, /\.lock$/,
    /\.min\.js$/, /\.min\.css$/, /\.map$/, /node_modules/,
  ];
  function shouldSkipFile(filename: string, content: string): boolean {
    if (SKIP_FILENAME_PATTERNS.some((re) => re.test(filename))) return true;
    // Skip minified single-line blobs (> 5 K chars on one line)
    if (!content.includes("\n") && content.length > 5000) return true;
    return false;
  }

  // For non-surgical mode, truncate files that are very large to head+tail so the
  // model still understands structure without paying for every middle line.
  const MAX_FULL_LINES = 300;
  const HEAD_LINES = 200;
  const TAIL_LINES = 80;
  function smartTruncate(filename: string, language: string, content: string): string {
    const lines = content.split("\n");
    const header = `=== ${filename} (${language}) ===`;
    if (lines.length <= MAX_FULL_LINES) return `${header}\n${content}`;
    const omitted = lines.length - HEAD_LINES - TAIL_LINES;
    const head = lines.slice(0, HEAD_LINES).join("\n");
    const tail = lines.slice(-TAIL_LINES).join("\n");
    return `${header} [${lines.length} lines total — middle ${omitted} lines omitted to save tokens]\n${head}\n\n... [${omitted} lines omitted] ...\n\n${tail}`;
  }

  const eligibleFiles = files.filter((f) => !shouldSkipFile(f.filename, f.content));

  const filesContext = isSurgical
    ? [
        `[SURGICAL EDIT MODE — focused file: ${focusedFile!.filename}]`,
        ``,
        `FOCUSED FILE (full content — this is the file you are editing):`,
        `=== ${focusedFile!.filename} (${focusedFile!.language}) ===`,
        focusedFile!.content,
        ``,
        eligibleFiles.filter((f) => f.id !== focusedFile!.id).length > 0
          ? `OTHER FILES IN PROJECT (listed for context only — do NOT output these unless the user explicitly asks to change them):\n` +
            eligibleFiles
              .filter((f) => f.id !== focusedFile!.id)
              .map((f) => `- ${f.filename} (${f.content.split("\n").length} lines)`)
              .join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : eligibleFiles.map((f) => smartTruncate(f.filename, f.language, f.content)).join("\n\n");

  const systemPrompt = `You are an AI coding assistant that builds web applications by modifying project files.

Current project: "${project.name}"
Description: "${project.description}"

Current files:
${filesContext}

${isSurgical
  ? `SURGICAL EDIT MODE IS ACTIVE. The user is focused on "${focusedFile!.filename}". You must:
1. Write a brief 1-2 sentence explanation of what you'll change in ${focusedFile!.filename}
2. Output ONLY "${focusedFile!.filename}" — do NOT touch other files unless the user specifically asks
3. Output the COMPLETE updated content of "${focusedFile!.filename}" — never truncate`
  : `When the user asks you to make changes:
1. Identify the MINIMUM set of files that must change to satisfy the request
2. Write a brief 1-2 sentence explanation of what you'll do and which file(s) you're changing
3. Output ONLY the file(s) that actually need to be modified — do NOT output files that are unchanged`}

For changes to EXISTING files, use the PATCH format. Only use full-file output for brand-new files.

PATCH FORMAT — use this for any edit to an existing file:
<edit file="filename.ext">
<old>
exact original lines to replace (must match file exactly, whitespace included)
</old>
<new>
replacement lines
</new>
</edit>

FULL FILE FORMAT — only for new files or when rebuilding from scratch:
<file name="filename.ext">
complete file content
</file>

CRITICAL RULES:
- PATCH FIRST: always prefer <edit> for changes to existing files — never rewrite an entire file just to change a few lines
- The <old> block must be copied verbatim from the existing file so it can be found and replaced exactly
- Multiple changes to the same file = multiple <edit> blocks, one per change
- For NEW files or complete rewrites (>50% changed), use <file> as normal
- Never truncate or use placeholders like "// rest of code"
- Keep HTML concise: avoid unnecessary comments, blank lines, and verbose attributes
- Combine CSS and JS inline inside index.html to minimise file count
- Use efficient, compact CSS (shorthand properties, no redundant rules)
- Never simplify or omit code just to save space — always output fully working, feature-complete code

${unlimited ? "" : `CONTENT POLICY — STRICTLY ENFORCED:
You are running inside Pronto, an AI-powered app builder. You must REFUSE to build any application that would directly compete with Pronto itself. This includes but is not limited to:
- AI-powered app builders, website builders, or code generators
- Natural language to code tools or interfaces
- Platforms where users describe software and AI writes it
- Clones or re-implementations of Pronto's core product

If a user asks you to build anything matching the above, respond with ONLY this message (no file output):
"Sorry, I can't help build an app that competes with Pronto. This is the one thing I'm not able to create here. Try describing a different kind of app — I can build just about anything else!"

All other types of applications are welcome: landing pages, dashboards, games, portfolios, tools, stores, social apps, etc.`}`;


  // Get AI client early — needed both for optional summarisation and the main stream
  const { client: anthropicClient, provider: aiProvider } = await getAIClient();

  // Strip <file> and <edit> blocks from assistant history messages.
  // The current file state is already in the system prompt, so re-sending
  // full file content from previous turns wastes thousands of tokens per request.
  function stripCodeBlocks(content: any): any {
    if (typeof content !== "string") return content;
    return content
      .replace(/<file name="[^"]*">[\s\S]*?<\/file>/g, "[file output — omitted from history]")
      .replace(/<edit file="[^"]*">[\s\S]*?<\/edit>/g, "[edit output — omitted from history]")
      .trim();
  }

  // Cap history at 40 rows (20 turns). If older messages exist, summarise them
  // with Haiku instead of silently dropping them, preserving key context cheaply.
  const MAX_HISTORY_MESSAGES = 40;
  const historyRows = existingMessages.slice(0, -1); // exclude the just-inserted user message

  let chatMessages: { role: "user" | "assistant"; content: any }[] = [];
  if (historyRows.length > MAX_HISTORY_MESSAGES) {
    const toSummarise = historyRows.slice(0, -MAX_HISTORY_MESSAGES);
    const recentRows   = historyRows.slice(-MAX_HISTORY_MESSAGES);
    const summary = await summarizeOldMessages(anthropicClient, toSummarise, project.name);
    chatMessages = [
      { role: "user",      content: `[Earlier session summary]\n${summary}` },
      { role: "assistant", content: "Understood — I have that earlier context." },
      ...recentRows.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.role === "assistant" ? stripCodeBlocks(m.content) : m.content,
      })),
    ];
  } else {
    chatMessages = historyRows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.role === "assistant" ? stripCodeBlocks(m.content) : m.content,
    }));
  }

  // Build the user message — images, PDFs, text files, or plain text
  if (body.fileContent && body.fileName) {
    // Text file: include its content inline so Claude can read it
    const fileBlock = `\n\n<uploaded_file name="${body.fileName}">\n${body.fileContent}\n</uploaded_file>`;
    chatMessages.push({ role: "user", content: (body.content || "") + fileBlock });
  } else if (body.imageData && body.imageMimeType) {
    const imageMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (body.imageMimeType === "application/pdf") {
      // PDF: send as document source
      chatMessages.push({
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: body.imageData },
            ...(body.fileName ? { title: body.fileName } : {}),
          },
          { type: "text", text: body.content || "What changes should I make based on this document?" },
        ],
      });
    } else {
      // Image: use vision
      const mime = imageMimes.includes(body.imageMimeType) ? body.imageMimeType : "image/jpeg";
      chatMessages.push({
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mime, data: body.imageData },
          },
          { type: "text", text: body.content || "What changes should I make based on this image?" },
        ],
      });
    }
  } else {
    chatMessages.push({ role: "user", content: body.content });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const streamStartTime = Date.now();
  let filesChangedCount = 0;

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
    filesChangedCount++;
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

  async function applyEdit(filename: string, rawBuf: string) {
    const oldMatch = rawBuf.match(/<old>([\s\S]*?)<\/old>/);
    const newMatch = rawBuf.match(/<new>([\s\S]*?)<\/new>/);
    if (!oldMatch || !newMatch) {
      console.warn(`[edit] Malformed edit block for "${filename}" — skipping`);
      return;
    }
    const oldStr = oldMatch[1].replace(/^\n/, "").replace(/\n$/, "");
    const newStr = newMatch[1].replace(/^\n/, "").replace(/\n$/, "");
    const existingFile = files.find((f) => f.filename === filename);
    if (!existingFile) {
      console.warn(`[edit] File "${filename}" not found — skipping`);
      return;
    }
    if (!existingFile.content.includes(oldStr)) {
      console.warn(`[edit] Old string not found in "${filename}" — falling back to no-op`);
      return;
    }
    const updated = existingFile.content.replace(oldStr, newStr);
    existingFile.content = updated;
    filesChangedCount++;
    const language = getLanguage(filename);
    await db.update(projectFilesTable)
      .set({ content: updated, language, updatedAt: new Date() })
      .where(eq(projectFilesTable.id, existingFile.id));
    res.write(`data: ${JSON.stringify({ type: "file_update", fileId: existingFile.id, filename, content: updated, language })}\n\n`);
  }

  let fullResponse = "";
  let streamBuf = "";
  let inFile = false;
  let currentFilename = "";
  let fileBuf = "";

  // Patch-edit state
  let inEdit = false;
  let editFilename = "";
  let editBuf = "";

  function safeConsume(tag: string): number {
    // Returns index to split at, holding back any partial tag suffix
    let splitAt = streamBuf.length;
    for (let i = 1; i < tag.length; i++) {
      if (streamBuf.endsWith(tag.slice(0, i))) { splitAt = streamBuf.length - i; break; }
    }
    return splitAt;
  }

  async function processStreamBuf() {
    while (true) {
      if (!inFile && !inEdit) {
        // Check for full-file tag
        const fileMatch = streamBuf.match(/<file name="([^"]+)">/);
        // Check for patch-edit tag
        const editMatch = streamBuf.match(/<edit file="([^"]+)">/);

        const fileIdx = fileMatch ? streamBuf.indexOf(fileMatch[0]) : Infinity;
        const editIdx = editMatch ? streamBuf.indexOf(editMatch[0]) : Infinity;

        if (fileIdx === Infinity && editIdx === Infinity) {
          if (streamBuf.length > 200) streamBuf = streamBuf.slice(-100);
          break;
        }

        if (fileIdx <= editIdx && fileMatch) {
          currentFilename = fileMatch[1];
          fileBuf = "";
          streamBuf = streamBuf.slice(fileIdx + fileMatch[0].length);
          inFile = true;
        } else if (editMatch) {
          editFilename = editMatch[1];
          editBuf = "";
          streamBuf = streamBuf.slice(editIdx + editMatch[0].length);
          inEdit = true;
        }
      } else if (inFile) {
        const closeIdx = streamBuf.indexOf("</file>");
        if (closeIdx !== -1) {
          fileBuf += streamBuf.slice(0, closeIdx);
          streamBuf = streamBuf.slice(closeIdx + 7);
          inFile = false;
          filesClosed++;
          await flushFile(currentFilename, fileBuf);
          fileBuf = "";
        } else {
          const splitAt = safeConsume("</file>");
          fileBuf += streamBuf.slice(0, splitAt);
          streamBuf = streamBuf.slice(splitAt);
          break;
        }
      } else {
        // inEdit — accumulate until </edit>
        const closeIdx = streamBuf.indexOf("</edit>");
        if (closeIdx !== -1) {
          editBuf += streamBuf.slice(0, closeIdx);
          streamBuf = streamBuf.slice(closeIdx + 7);
          inEdit = false;
          filesClosed++;
          await applyEdit(editFilename, editBuf);
          editBuf = "";
        } else {
          const splitAt = safeConsume("</edit>");
          editBuf += streamBuf.slice(0, splitAt);
          streamBuf = streamBuf.slice(splitAt);
          break;
        }
      }
    }
  }

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(": keep-alive\n\n");
  }, 15000);

  // Auto-stop tracking — we break out of the stream loop once we detect Claude
  // is emitting filler text after all <file> blocks have already been closed.
  let filesClosed = 0;
  let charsAfterLastClose = 0;
  const AUTO_STOP_CHARS = 300;

  try {
    // ── Ruflo: classify task and check for swarm mode ──
    const hasAttachment = !!(body.imageData || body.fileContent);
    const classification = classifyTask(
      body.content ?? "",
      files.length,
      !!focusedFile,
      hasAttachment,
    );

    // Check orchestration mode from settings
    let orchestrationMode = "auto";
    try {
      const [settings] = await db.select().from(appSettingsTable).limit(1);
      orchestrationMode = settings?.orchestrationMode ?? "auto";
    } catch {}

    const useSwarm = classification.requiresSwarm && orchestrationMode !== "single";

    if (useSwarm) {
      // ── Multi-agent swarm execution path ──
      const providers = await getAvailableProviders();
      const memBackend = new PgMemoryBackend();
      const swarm = new ProntoSwarmOrchestrator(memBackend, providers);
      const userMsgRow = await db
        .select()
        .from(projectMessagesTable)
        .where(eq(projectMessagesTable.projectId, project.id))
        .orderBy(desc(projectMessagesTable.createdAt))
        .limit(1);
      const msgId = userMsgRow[0]?.id ?? 0;

      const swarmResult = await swarm.executeSwarm({
        userMessage: body.content ?? "",
        projectId: project.id,
        messageId: msgId,
        files: files.map((f) => ({ filename: f.filename, content: f.content })),
        classification,
        sseWriter: (event) => {
          if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
      });

      // Apply file changes from swarm
      let filesChangedCount = 0;
      for (const change of swarmResult.fileChanges) {
        if (change.isEdit && change.editOld && change.editNew) {
          await applyEdit(change.filename, `<old>${change.editOld}</old><new>${change.editNew}</new>`);
          filesChangedCount++;
        } else if (!change.isEdit && change.content) {
          await flushFile(change.filename, change.content);
          filesChangedCount++;
        }
      }

      // Build assistant message from swarm output
      const swarmSummary = swarmResult.agentResults
        .filter((r) => r.agentType !== "reviewer")
        .map((r) => r.rawOutput)
        .join("\n\n");
      fullResponse = swarmSummary;

      // Credit accounting
      const creditsUsed = swarmResult.totalCredits;
      if (userId && !unlimited) {
        await db.insert(creditLedgerTable).values({
          userId,
          amount: -creditsUsed,
          type: "ai_usage",
          description: `Swarm: ${swarmResult.agentResults.length} agents, ${filesChangedCount} files changed`,
        });
      }

      // Send done event with agent breakdown
      const agentBreakdown = swarmResult.agentResults.map((r) => ({
        agent: r.agentType,
        model: r.model,
        credits: calculateCredits(r.model, r.inputTokens, r.outputTokens),
      }));

      const balance = userId ? await getUserBalance(userId) : 0;
      res.write(`data: ${JSON.stringify({
        type: "done",
        balance,
        creditsUsed,
        agentBreakdown,
        swarm: true,
      })}\n\n`);

      // Save assistant message
      await db.insert(projectMessagesTable).values({
        projectId: project.id,
        role: "assistant",
        content: fullResponse,
      });

      // Auto-save version
      await saveVersion(project.id);

      clearInterval(keepAlive);
      res.end();
      return;
    }

    // ── Single-agent execution path (existing behavior, with ruflo routing) ──
    // Try ruflo model routing first, fall back to original logic
    let model: string;
    let THINK_BUDGET: number;
    const userWordCount = (body.content ?? "").trim().split(/\s+/).filter(Boolean).length;
    const focusedFileLines = focusedFile ? focusedFile.content.split("\n").length : 0;
    const isSimpleEdit = isSurgical && userWordCount < 200 && files.length > 0
      && focusedFileLines < 150
      && !hasAttachment;

    try {
      const providers = await getAvailableProviders();
      if (providers.length > 1) {
        // Multi-provider available: use ruflo router
        const memBackend = new PgMemoryBackend();
        const router = new ModelRouter(memBackend);
        const decision = await router.route(classification, providers);
        model = decision.model;
        THINK_BUDGET = decision.thinkingBudget;
      } else {
        throw new Error("single provider, use defaults");
      }
    } catch {
      // Fallback to original Haiku/Sonnet selection
      model = isSimpleEdit ? "claude-haiku-4-5" : "claude-sonnet-4-6";
      const useThinking = !isSimpleEdit;
      const isNewProject = files.length === 0;
      const isLargeCodebase = eligibleFiles.length > 5;
      const isComplexRequest = userWordCount > 150;
      THINK_BUDGET = !useThinking
        ? 0
        : isNewProject
          ? 12_000
          : isComplexRequest || isLargeCodebase
            ? 8_000
            : 5_000;
    }

    const streamParams: any = {
      model,
      max_tokens: isSimpleEdit ? 8_000 : 64_000 + THINK_BUDGET,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }] as any,
      messages: chatMessages,
      ...(THINK_BUDGET > 0 ? { thinking: { type: "enabled", budget_tokens: THINK_BUDGET } } : {}),
    };
    const stream = anthropicClient.messages.stream(streamParams as any);

    for await (const event of stream) {
      // Forward thinking blocks to the client so it can display a planning indicator
      if (event.type === "content_block_start" && (event.content_block as any).type === "thinking") {
        res.write(`data: ${JSON.stringify({ type: "thinking_start" })}\n\n`);
      }

      if (event.type === "content_block_delta") {
        const delta = event.delta as any;

        if (delta.type === "thinking_delta") {
          res.write(`data: ${JSON.stringify({ type: "thinking_delta", content: delta.thinking ?? "" })}\n\n`);
          continue;
        }

        if (delta.type !== "text_delta") continue;
      }

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const chunk = event.delta.text;
        fullResponse += chunk;
        streamBuf += chunk;
        res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
        const prevClosed = filesClosed;
        await processStreamBuf();

        // Track how many chars accumulate after the last </file> close.
        // If Claude keeps generating prose after all files are done, stop early.
        if (filesClosed > 0 && !inFile) {
          if (filesClosed > prevClosed) {
            charsAfterLastClose = 0; // just closed a file, reset counter
          } else {
            charsAfterLastClose += chunk.length;
          }
          if (charsAfterLastClose > AUTO_STOP_CHARS) {
            break; // stop streaming — all file content already received
          }
        }
      }
    }

    // Get token usage — if we broke out early (auto-stop) the stream may not have
    // a message_stop event yet; fall back to estimation from response length.
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason: string | null = null;
    try {
      const finalMsg = await stream.finalMessage();
      inputTokens  = finalMsg.usage?.input_tokens  ?? 0;
      outputTokens = finalMsg.usage?.output_tokens ?? 0;
      stopReason   = finalMsg.stop_reason ?? null;
    } catch {
      // Early-stop path: estimate tokens from accumulated text (~4 chars/token)
      outputTokens = Math.ceil(fullResponse.length / 4);
    }
    const creditsUsed  = calculateCredits(model, inputTokens, outputTokens);

    console.log(`[credits] model=${model} think=${THINK_BUDGET} stop=${stopReason} in=${inputTokens} out=${outputTokens} credits=${creditsUsed}`);

    if (inEdit && editBuf.trim()) {
      if (stopReason !== "max_tokens") {
        await applyEdit(editFilename, editBuf);
      }
    }

    if (inFile && fileBuf.trim()) {
      if (stopReason === "max_tokens") {
        // The model ran out of output tokens mid-file — flushing a half-written file
        // would silently corrupt the project. Discard the fragment and tell the user.
        console.warn(`[truncation] ${currentFilename} was cut off at max_tokens — NOT flushing`);
        res.write(`data: ${JSON.stringify({
          type: "error",
          error: `The file "${currentFilename}" was too large to complete in one generation. ` +
                 `Please turn off Surgical mode and try again — full mode has a much larger output budget.`,
        })}\n\n`);
      } else {
        // Stream ended normally (end_turn or early auto-stop) — flush what we have
        await flushFile(currentFilename, fileBuf);
      }
    }

    await db.update(projectsTable).set({ updatedAt: new Date() }).where(eq(projectsTable.id, projectId));

    await db.insert(projectMessagesTable).values({ projectId, role: "assistant", content: fullResponse });

    await saveVersion(projectId);

    // Always log AI usage (regardless of unlimited status) for admin analytics
    const costUsd = calculateCostUsd(model, inputTokens, outputTokens);
    db.insert(aiUsageLogTable).values({
      userId: userId ?? null,
      projectId,
      provider: aiProvider,
      model,
      inputTokens,
      outputTokens,
      costUsd,
      creditsCharged: creditsUsed,
    }).catch((e) => console.error("Failed to log AI usage:", e));

    if (userId) {
      await db.insert(creditLedgerTable).values({
        userId, amount: -creditsUsed, type: "ai_generation",
        description: `AI generation for project ${projectId} (${inputTokens} in / ${outputTokens} out tokens)`,
      });

      if (!unlimited) {
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
    }

    const newBalance = unlimited ? null : (userId ? await getUserBalance(userId) : null);
    const durationMs = Date.now() - streamStartTime;
    res.write(`data: ${JSON.stringify({
      type: "done",
      creditsRemaining: newBalance,
      unlimited,
      creditsUsed,
      inputTokens,
      outputTokens,
      filesChanged: filesChangedCount,
      durationMs,
      model,
    })}\n\n`);
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

// ── Computer Use: AI reviews and interacts with the app preview ──
router.post("/projects/:id/computer-use", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { task, previewUrl } = req.body;

  if (!previewUrl) {
    res.status(400).json({ error: "previewUrl is required" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Get API key
  const [settings] = await db.select().from(appSettingsTable).limit(1);
  const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "No Anthropic API key configured" });
    return;
  }

  // SSE stream for real-time updates
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await runComputerUseLoop(
      apiKey,
      previewUrl,
      task || `Review this app "${project.name}" for visual and functional issues. Test all interactive elements. Report what needs fixing.`,
      (event) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      },
    );

    // Send final result
    res.write(`data: ${JSON.stringify({
      type: "computer_use_done",
      actions: result.actions.length,
      iterations: result.iterations,
      codeChanges: result.codeChanges,
      screenshot: result.finalScreenshot,
    })}\n\n`);

    // Save as assistant message
    await db.insert(projectMessagesTable).values({
      projectId,
      role: "assistant",
      content: `[Computer Use Analysis]\n\n${result.codeChanges}`,
    });

    res.end();
  } catch (err: any) {
    console.error("Computer use error:", err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
