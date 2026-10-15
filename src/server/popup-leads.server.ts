import { randomUUID } from "node:crypto";

import { database } from "./database.server";

type PopupLead = {
  name: string;
  mobile: string;
  email: string;
  interestedIn: string;
  message: string;
  source: string;
  createdAt: string;
};

export async function handlePopupLeadRequest(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return json({ error: "Use a JSON request." }, 400);
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Use a valid enquiry." }, 400);
    const lead: PopupLead = {
      name: cleanText(body["name"], 120),
      mobile: cleanText(body["mobile"], 30),
      email: cleanText(body["email"], 254),
      interestedIn: cleanText(body["interestedIn"], 120) || "Sanitary Pads",
      message: cleanText(body["message"], 1000),
      source: cleanText(body["source"], 80) || "Website popup",
      createdAt: new Date().toISOString(),
    };
    if (!lead.name || !lead.mobile) return json({ error: "Name and phone number are required." }, 400);
    if (!/^[+0-9 ()-]{7,20}$/.test(lead.mobile)) return json({ error: "Enter a valid phone number." }, 400);
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return json({ error: "Enter a valid email address." }, 400);

    if (process.env["MYSQL_HOST"] && process.env["MYSQL_USER"] && process.env["MYSQL_DATABASE"]) {
      const { executeSql } = await import("./mysql.server");
      await executeSql(
        `INSERT INTO popup_leads (name, mobile, email, interested_product_text, message, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [lead.name, lead.mobile, lead.email || null, lead.interestedIn, lead.message || null, lead.source],
      );
    } else {
      database()
        .prepare("INSERT INTO popup_leads (id, data, created_at) VALUES (?, ?, ?)")
        .run(randomUUID(), JSON.stringify(lead), lead.createdAt);
    }

    return json({ ok: true, lead }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Use valid JSON." }, 400);
    console.error("Popup lead API failed:", error instanceof Error ? error.message : error);
    return json({ error: "Could not save lead." }, 500);
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
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
