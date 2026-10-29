export async function newsletterPayload(queryRows) {
  const subscribers = await queryRows(
    "SELECT email, status, subscribed_at, updated_at FROM newsletter_subscribers ORDER BY updated_at DESC, id DESC",
  );
  const active = subscribers.filter((subscriber) => subscriber.status === "ACTIVE").length;
  return {
    title: "Newsletter Subscribers",
    action: "Add Subscriber",
    columns: ["Email", "Source", "Subscribed", "Updated", "Status"],
    rows: subscribers.map((subscriber) => [
      subscriber.email,
      "Website newsletter",
      dateValue(subscriber.subscribed_at),
      dateValue(subscriber.updated_at),
      subscriber.status,
    ]),
    metrics: [
      {
        label: "Subscribers",
        value: String(subscribers.length),
        trend: "Stored in MySQL",
        tone: "up",
      },
      { label: "Active", value: String(active), trend: "Newsletter list", tone: "up" },
      {
        label: "Unsubscribed",
        value: String(
          subscribers.filter((subscriber) => subscriber.status === "UNSUBSCRIBED").length,
        ),
        trend: "Not subscribed",
        tone: "neutral",
      },
      { label: "Storage", value: "MySQL", trend: "Admin visible", tone: "up" },
    ],
    source: "mysql",
  };
}

function dateValue(value) {
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
}
