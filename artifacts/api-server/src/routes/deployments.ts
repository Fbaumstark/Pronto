import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deploymentsTable, projectFilesTable, projectsTable, creditLedgerTable } from "@workspace/db";
import { nanoid } from "nanoid";
import { getUserBalance, triggerAutoTopup } from "./credits";
import { isUnlimitedUser } from "../lib/admin";

const DEPLOY_COST = 10000;   // first deploy
const REDEPLOY_COST = 2000;  // push update to existing deployment

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
  const user = (req as any).user;
  const userId = user?.id as string | undefined;

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

  const isFirstDeploy = !existing || !existing.isLive;
  const cost = isFirstDeploy ? DEPLOY_COST : REDEPLOY_COST;
  const unlimited = isUnlimitedUser(user?.email);

  // Credit check for non-unlimited users
  if (userId && !unlimited) {
    const balance = await getUserBalance(userId);
    if (balance < cost) {
      res.status(402).json({
        error: `Insufficient credits. Deploying costs ${cost.toLocaleString()} credits (you have ${balance.toLocaleString()}).`,
        creditsRequired: cost,
        creditsAvailable: balance,
      });
      return;
    }
  }

  let deployment;
  if (existing) {
    const [updated] = await db
      .update(deploymentsTable)
      .set({ isLive: true, updatedAt: new Date() })
      .where(eq(deploymentsTable.id, existing.id))
      .returning();
    deployment = updated;
  } else {
    const slug = `pronto-${nanoid(8)}`;
    const [created] = await db
      .insert(deploymentsTable)
      .values({ projectId, slug, isLive: true })
      .returning();
    deployment = created;
  }

  // Deduct credits
  if (userId && !unlimited) {
    await db.insert(creditLedgerTable).values({
      userId,
      amount: -cost,
      type: "deployment",
      description: `${isFirstDeploy ? "Deploy" : "Redeploy"}: ${project.name}`,
    });

    const newBalance = await getUserBalance(userId);

    // Auto top-up if balance hits zero
    if (newBalance <= 0 && user?.stripeCustomerId) {
      triggerAutoTopup(userId, user.stripeCustomerId).catch((e) =>
        console.error("Auto top-up failed after deploy:", e)
      );
    }

    res.json({ ...deployment, creditsUsed: cost, creditsRemaining: newBalance });
    return;
  }

  res.json(deployment);
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

async function servePublishedApp(slug: string, res: any) {
  const [deployment] = await db
    .select()
    .from(deploymentsTable)
    .where(eq(deploymentsTable.slug, slug));

  if (!deployment || !deployment.isLive) {
    res.status(404).send(`<!DOCTYPE html><html><head><title>Not Found – Pronto</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff}.box{text-align:center;padding:2rem}.logo{font-size:2rem;font-weight:800;background:linear-gradient(135deg,#6d28d9,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.msg{color:#888;margin-top:.5rem}</style></head><body><div class="box"><div class="logo">⚡ Pronto</div><h2>App not found</h2><p class="msg">This app may have been unpublished or the link is incorrect.</p></div></body></html>`);
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
}

// Clean branded URL: /api/p/pronto-xxxxxxxx
router.get("/p/:slug", async (req, res) => {
  await servePublishedApp(req.params.slug, res);
});

// Legacy route kept for backward compatibility
router.get("/published/:slug", async (req, res) => {
  await servePublishedApp(req.params.slug, res);
});

export default router;
