export async function popupLeadsPayload(queryRows) {
  const leads = await queryRows(`
    SELECT id, name, mobile, email, interested_product_text, message, submitted_at, source, status
    FROM popup_leads WHERE deleted_at IS NULL ORDER BY submitted_at DESC, id DESC
  `);
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  return {
    title: "Pop-up Leads",
    notificationIds: leads.map((lead) => `mysql:${lead.id}`),
    action: "Add Lead",
    columns: ["Name", "Mobile", "Email", "Interested In", "Message", "Date", "Source", "Status"],
    rows: leads.map((lead) => [
      lead.name || "Website visitor",
      lead.mobile || "-",
      lead.email || "-",
      lead.interested_product_text || "Sanitary Pads",
      lead.message || "-",
      (lead.submitted_at instanceof Date
        ? lead.submitted_at.toISOString()
        : String(lead.submitted_at)
      ).slice(0, 10),
      lead.source || "Website popup",
      lead.status,
    ]),
    metrics: [
      {
        label: "Persisted Leads",
        value: String(leads.length),
        trend: "Stored in MySQL",
        tone: "up",
      },
      {
        label: "New Leads",
        value: String(newCount),
        trend: "Website enquiries",
        tone: newCount ? "warn" : "neutral",
      },
      { label: "Source", value: "Website", trend: "Contact and popup forms", tone: "neutral" },
      { label: "Storage", value: "MySQL", trend: "Admin visible", tone: "up" },
    ],
    source: "mysql",
  };
}
