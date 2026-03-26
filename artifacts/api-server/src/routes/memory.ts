import { Router, type IRouter } from "express";
import { PgMemoryBackend } from "../lib/ruflo/pg-memory-backend";
import { startAutoMode, stopAutoMode, getAutoMode, isAutoModeActive, incrementAutoStep, planNextAutoStep } from "../lib/ruflo/auto-mode";
import { dreamUp, type DreamConfig } from "../lib/ruflo/auto-dream";
import { recallMemories, forgetMemory, forgetAllMemories, formatMemoriesForPrompt } from "../lib/ruflo/auto-memory";
import { getAIClient } from "../lib/ai-client";

const router: IRouter = Router();
const memoryBackend = new PgMemoryBackend();

// List memories for a project
router.get("/projects/:id/memory", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const type = req.query.type as string | undefined;
    const limit = Number(req.query.limit) || 50;

    const memories = await memoryBackend.query({ projectId, type, limit });
    res.json({ memories });
  } catch (err) {
    console.error("Error fetching memories:", err);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

// Delete a specific memory
router.delete("/projects/:id/memory/:memoryId", async (req, res) => {
  try {
    const memoryId = Number(req.params.memoryId);
    await memoryBackend.delete(memoryId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting memory:", err);
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

// Clear all memories for a project
router.delete("/projects/:id/memory", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const count = await memoryBackend.clearProject(projectId);
    res.json({ success: true, cleared: count });
  } catch (err) {
    console.error("Error clearing memories:", err);
    res.status(500).json({ error: "Failed to clear memories" });
  }
});

// ── Auto Mode endpoints ──

router.post("/projects/:id/auto-mode/start", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { goals, maxSteps } = req.body;
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      res.status(400).json({ error: "goals array is required" });
      return;
    }
    const config = startAutoMode(projectId, goals, maxSteps || 10);
    res.json({ success: true, config });
  } catch (err) {
    console.error("Error starting auto mode:", err);
    res.status(500).json({ error: "Failed to start auto mode" });
  }
});

router.post("/projects/:id/auto-mode/stop", async (req, res) => {
  const projectId = Number(req.params.id);
  stopAutoMode(projectId);
  res.json({ success: true });
});

router.get("/projects/:id/auto-mode/status", async (req, res) => {
  const projectId = Number(req.params.id);
  const config = getAutoMode(projectId);
  res.json({ active: !!config, config });
});

router.post("/projects/:id/auto-mode/next", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { files, lastAssistantMessage, projectName } = req.body;

    if (!isAutoModeActive(projectId)) {
      res.json({ done: true, reason: "auto mode not active" });
      return;
    }

    const config = getAutoMode(projectId)!;
    const { client } = await getAIClient();

    const nextPrompt = await planNextAutoStep(
      client,
      "claude-haiku-4-5",
      projectName || "My App",
      files || [],
      config.goals,
      config.currentStep,
      config.maxSteps,
      lastAssistantMessage || "",
    );

    if (!nextPrompt) {
      stopAutoMode(projectId);
      res.json({ done: true, reason: "goals accomplished" });
      return;
    }

    incrementAutoStep(projectId);
    res.json({
      done: false,
      nextPrompt,
      step: config.currentStep,
      maxSteps: config.maxSteps,
    });
  } catch (err) {
    console.error("Error in auto mode next:", err);
    res.status(500).json({ error: "Failed to plan next step" });
  }
});

// ── Auto Dream endpoints ──

router.post("/projects/:id/dream", async (req, res) => {
  try {
    const { idea, config } = req.body;
    if (!idea) {
      res.status(400).json({ error: "idea is required" });
      return;
    }
    const { client } = await getAIClient();
    const result = await dreamUp(client, "claude-sonnet-4-6", idea, config as Partial<DreamConfig>);
    res.json(result);
  } catch (err) {
    console.error("Error in dream mode:", err);
    res.status(500).json({ error: "Failed to dream up app" });
  }
});

// ── Auto Memory (user-level) endpoints ──

router.get("/user/memories", async (req, res) => {
  try {
    const userId = req.isAuthenticated() ? req.user.id : null;
    if (!userId) {
      res.json({ memories: [] });
      return;
    }
    const memories = await recallMemories(userId, null, 50);
    res.json({ memories });
  } catch (err) {
    console.error("Error fetching user memories:", err);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

router.get("/user/memories/prompt", async (req, res) => {
  try {
    const userId = req.isAuthenticated() ? req.user.id : null;
    if (!userId) {
      res.json({ prompt: "" });
      return;
    }
    const memories = await recallMemories(userId, null, 20);
    const prompt = formatMemoriesForPrompt(memories);
    res.json({ prompt });
  } catch (err) {
    res.status(500).json({ error: "Failed to format memories" });
  }
});

router.delete("/user/memories/:memoryId", async (req, res) => {
  try {
    await forgetMemory(Number(req.params.memoryId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

router.delete("/user/memories", async (req, res) => {
  try {
    const userId = req.isAuthenticated() ? req.user.id : null;
    if (!userId) {
      res.json({ success: true });
      return;
    }
    await forgetAllMemories(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear memories" });
  }
});

export default router;
