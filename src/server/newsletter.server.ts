import { randomUUID } from "node:crypto";

import { database } from "./database.server";

type NewsletterSubscriber = {
  email: string;
  source: string;
  status: "ACTIVE";
  createdAt: string;
  updatedAt: string;
};

export async function handleNewsletterRequest(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return json({ error: "Use a JSON request." }, 400);
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Use a valid signup." }, 400);
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const source = cleanText(body["source"], 80) || "Footer newsletter";
    if (email.length > 254 || !isValidEmail(email))
      return json({ error: "Enter a valid email address." }, 400);

    const now = new Date().toISOString();
    if (process.env["MYSQL_HOST"] && process.env["MYSQL_USER"] && process.env["MYSQL_DATABASE"]) {
      const { executeSql } = await import("./mysql.server");
      await executeSql(
        `INSERT INTO newsletter_subscribers (email, status) VALUES (?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE status = 'ACTIVE', unsubscribed_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [email],
      );
    } else {
      database()
        .prepare(
          `
          INSERT INTO newsletter_subscribers (id, email, source, status, created_at, updated_at)
          VALUES (?, ?, ?, 'ACTIVE', ?, ?)
          ON CONFLICT(email) DO UPDATE SET
            source=excluded.source,
            status='ACTIVE',
            updated_at=excluded.updated_at
        `,
        )
        .run(randomUUID(), email, source, now, now);
    }

    const subscriber: NewsletterSubscriber = {
      email,
      source,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    return json({ ok: true, subscriber }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Use valid JSON." }, 400);
    console.error("Newsletter API failed:", error instanceof Error ? error.message : error);
    return json({ error: "Could not save newsletter signup." }, 500);
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
