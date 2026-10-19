const storageKey = "sherise-admin-seen-leads";
export const leadsSeenEvent = "sherise-admin-leads-seen";
let sessionSeen = new Set<string>();

function seenLeads() {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(stored)) {
      return new Set([...sessionSeen, ...stored.filter((id): id is string => typeof id === "string")]);
    }
  } catch {
    // Keep notifications usable when browser storage is unavailable.
  }
  return new Set(sessionSeen);
}

export function unreadLeadCount(ids: string[]) {
  const seen = seenLeads();
  return ids.filter((id) => !seen.has(id)).length;
}

export function markLeadsSeen(ids: string[]) {
  const seen = seenLeads();
  const unread = ids.filter((id) => !seen.has(id));
  if (!unread.length) return;
  unread.forEach((id) => seen.add(id));
  sessionSeen = seen;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...seen]));
  } catch {
    // The in-memory copy still clears notifications for this session.
  }
  window.dispatchEvent(new Event(leadsSeenEvent));
}
