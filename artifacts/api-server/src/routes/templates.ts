import { Router, type IRouter } from "express";
import { db, templatesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/templates", async (_req, res) => {
  const templates = await db.select().from(templatesTable).orderBy(templatesTable.name);
  res.json(templates);
});

export default router;
