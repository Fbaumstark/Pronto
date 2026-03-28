import { Router, type IRouter } from "express";
import { getSettings, updateSettings, invalidateSettingsCache } from "../lib/ai-client";

const router: IRouter = Router();

router.get("/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const { provider, ownApiKey, openaiApiKey, googleApiKey, orchestrationMode } = req.body;
    if (!provider || !["replit", "own"].includes(provider)) {
      res.status(400).json({ error: "provider must be 'replit' or 'own'" });
      return;
    }
    if (orchestrationMode && !["auto", "single", "swarm"].includes(orchestrationMode)) {
      res.status(400).json({ error: "orchestrationMode must be 'auto', 'single', or 'swarm'" });
      return;
    }
    const updated = await updateSettings(provider, ownApiKey, openaiApiKey, googleApiKey, orchestrationMode);
    invalidateSettingsCache();
    res.json(updated);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
