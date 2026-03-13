import { Router, type IRouter } from "express";
import { eq, sum } from "drizzle-orm";
import { db, creditLedgerTable } from "@workspace/db";
import { isUnlimitedUser } from "../lib/admin";

const router: IRouter = Router();

async function getUserBalance(userId: string): Promise<number> {
  const result = await db
    .select({ total: sum(creditLedgerTable.amount) })
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, userId));
  return Number(result[0]?.total ?? 0);
}

router.get("/credits", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (isUnlimitedUser(req.user.email)) {
    res.json({ balance: null, unlimited: true });
    return;
  }

  const balance = await getUserBalance(req.user.id);
  res.json({ balance, unlimited: false });
});

router.get("/credits/history", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const history = await db
    .select()
    .from(creditLedgerTable)
    .where(eq(creditLedgerTable.userId, req.user.id))
    .orderBy(creditLedgerTable.createdAt);
  res.json(history);
});

export { getUserBalance };
export default router;
