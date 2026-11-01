import { Hono } from "hono";
import { PaystackClient } from "paystack-sdk-node";
import { db } from "../lib/db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../errors";
import type { AppEnv } from "../types";
import { z } from "zod";
import crypto from "node:crypto"; // S17 FIX

const paystack = new PaystackClient({
  apiKey: process.env.PAYSTACK_SECRET_KEY!,
});

export const billingRoutes = new Hono<AppEnv>();

const checkoutSchema = z.object({
  projectId: z.string().uuid(),
  tier: z.enum(["growth", "scale"]),
});

billingRoutes.post("/checkout", async (c) => {
  const body = await c.req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) throw new AppError("invalid_request", "Invalid payload", 400);

  const { projectId, tier } = parsed.data;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new AppError("invalid_request", "Project not found", 404);

  const amount = tier === "growth" ? 49900 : 149900; 

  try {
    const tx = await paystack.transactions.initialize({
      email: "developer@vizzly.co.za", 
      amount: amount,
      currency: "ZAR",
      callback_url: `http://localhost:3000/dashboard?success=true`,
      metadata: {
        projectId: project.id,
        tier: tier,
        expectedAmount: amount // S17 FIX: Track expected amount
      }
    });

    if (!tx.data || !tx.data.authorization_url) {
      throw new AppError("internal_error", "Failed to get checkout URL from Paystack", 500);
    }

    return c.json({ url: tx.data.authorization_url });
    
  } catch (err: any) {
    console.error("Paystack Error:", err);
    throw new AppError("internal_error", "Failed to initialize payment", 500);
  }
});

billingRoutes.post("/webhook", async (c) => {
  const signature = c.req.header("x-paystack-signature");
  const body = await c.req.text(); 

  if (!signature) {
    return c.json({ error: "No signature" }, 400);
  }

  // S17 FIX: Verify signature using timingSafeEqual
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");

  const bufferA = Buffer.from(hash);
  const bufferB = Buffer.from(signature);

  if (bufferA.length !== bufferB.length || !crypto.timingSafeEqual(bufferA, bufferB)) {
    console.log("Webhook signature mismatch!");
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const metadata = event.data.metadata;
    const { projectId, tier, expectedAmount } = metadata;

    // S17 FIX: Verify the amount and currency actually match the tier
    if (event.data.amount !== expectedAmount || event.data.currency !== "ZAR") {
      console.error("Webhook amount/currency mismatch!");
      return c.json({ error: "Amount mismatch" }, 400);
    }
    
    if (projectId && tier) {
      await db.update(projects)
        .set({ planTier: tier })
        .where(eq(projects.id, projectId));
        
      console.log(`Successfully upgraded project ${projectId} to ${tier}`);
    }
  }

  return c.json({ status: "success" });
});