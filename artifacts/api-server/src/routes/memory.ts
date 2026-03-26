import { Router, type IRouter } from "express";
import { PgMemoryBackend } from "../lib/ruflo/pg-memory-backend";

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

export default router;
