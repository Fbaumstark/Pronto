import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectVersionsTable, projectFilesTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/projects/:id/versions", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const versions = await db
    .select()
    .from(projectVersionsTable)
    .where(eq(projectVersionsTable.projectId, projectId))
    .orderBy(desc(projectVersionsTable.versionNumber));
  res.json(versions);
});

router.post("/projects/:id/versions/restore/:versionId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const versionId = parseInt(req.params.versionId);

  const [version] = await db
    .select()
    .from(projectVersionsTable)
    .where(eq(projectVersionsTable.id, versionId));

  if (!version || version.projectId !== projectId) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  const existingFiles = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));

  for (const snap of version.filesSnapshot) {
    const existing = existingFiles.find((f) => f.filename === snap.filename);
    if (existing) {
      await db
        .update(projectFilesTable)
        .set({ content: snap.content, language: snap.language, updatedAt: new Date() })
        .where(eq(projectFilesTable.id, existing.id));
    } else {
      await db.insert(projectFilesTable).values({
        projectId,
        filename: snap.filename,
        content: snap.content,
        language: snap.language,
      });
    }
  }

  const filesToDelete = existingFiles.filter(
    (f) => !version.filesSnapshot.find((s) => s.filename === f.filename)
  );
  for (const f of filesToDelete) {
    await db.delete(projectFilesTable).where(eq(projectFilesTable.id, f.id));
  }

  await db
    .update(projectsTable)
    .set({ updatedAt: new Date() })
    .where(eq(projectsTable.id, projectId));

  res.json({ success: true, restored: version.versionNumber });
});

export default router;
