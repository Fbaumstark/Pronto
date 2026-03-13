import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deploymentsTable, projectFilesTable, projectsTable } from "@workspace/db";
import { nanoid } from "nanoid";

const router: IRouter = Router();

router.get("/projects/:id/deployment", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));
  res.json(deployment ?? null);
});

router.post("/projects/:id/deploy", async (req, res) => {
  const projectId = parseInt(req.params.id);

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));

  if (existing) {
    const [updated] = await db
      .update(deploymentsTable)
      .set({ isLive: true, updatedAt: new Date() })
      .where(eq(deploymentsTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const slug = nanoid(10);
    const [created] = await db
      .insert(deploymentsTable)
      .values({ projectId, slug, isLive: true })
      .returning();
    res.json(created);
  }
});

router.post("/projects/:id/undeploy", async (req, res) => {
  const projectId = parseInt(req.params.id);
  await db
    .update(deploymentsTable)
    .set({ isLive: false, updatedAt: new Date() })
    .where(eq(deploymentsTable.projectId, projectId));
  res.json({ success: true });
});

router.put("/projects/:id/deployment/domain", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { customDomain } = req.body;

  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.projectId, projectId));

  if (!deployment) {
    res.status(404).json({ error: "Deploy the project first" });
    return;
  }

  const [updated] = await db
    .update(deploymentsTable)
    .set({ customDomain: customDomain || null, updatedAt: new Date() })
    .where(eq(deploymentsTable.id, deployment.id))
    .returning();

  res.json(updated);
});

router.get("/published/:slug", async (req, res) => {
  const { slug } = req.params;
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.slug, slug));

  if (!deployment || !deployment.isLive) {
    res.status(404).send("<html><body><h2>App not found or unpublished.</h2></body></html>");
    return;
  }

  const files = await db
    .select()
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, deployment.projectId));

  const indexFile = files.find((f) => f.filename === "index.html") ?? files[0];
  if (!indexFile) {
    res.status(404).send("<html><body><h2>No files found.</h2></body></html>");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(indexFile.content);
});

export default router;
