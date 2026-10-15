export async function popupLeadsPayload(queryRows) {
  const leads = await queryRows(`
    SELECT name, mobile, email, interested_product_text, message, submitted_at, status
    FROM popup_leads WHERE deleted_at IS NULL ORDER BY submitted_at DESC, id DESC
  `);
  const newCount = leads.filter((lead) => lead.status === "NEW").length;
  return {
    title: "Pop-up Leads",
    action: "Add Lead",
    columns: ["Name", "Mobile", "Email", "Interested In", "Message", "Date", "Status"],
    rows: leads.map((lead) => [
      lead.name || "Website visitor", lead.mobile || "-", lead.email || "-",
      lead.interested_product_text || "Sanitary Pads", lead.message || "-",
      (lead.submitted_at instanceof Date ? lead.submitted_at.toISOString() : String(lead.submitted_at)).slice(0, 10),
      lead.status,
    ]),
    metrics: [
      { label: "Persisted Leads", value: String(leads.length), trend: "Stored in MySQL", tone: "up" },
      { label: "New Leads", value: String(newCount), trend: "Popup enquiries", tone: newCount ? "warn" : "neutral" },
      { label: "Source", value: "Popup", trend: "Homepage enquiry form", tone: "neutral" },
      { label: "Storage", value: "MySQL", trend: "Admin visible", tone: "up" },
    ],
    source: "mysql",
  };
}
