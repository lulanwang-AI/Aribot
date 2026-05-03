const STORAGE_KEY = "ari_analytics";

interface AnalyticsEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: number;
}

function getEvents(): AnalyticsEvent[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function recordEvent(type: string, payload: Record<string, any> = {}) {
  const events = getEvents();
  events.push({ type, payload, timestamp: Date.now() });
  saveEvents(events);
}

export function getTrending(rangeDays: number = 7) {
  const events = getEvents();
  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => e.timestamp >= cutoff);

  const tagCounts: Record<string, number> = {};
  const specialtyCounts: Record<string, number> = {};

  for (const event of recent) {
    if (event.payload.tags) {
      for (const tag of event.payload.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    if (event.payload.specialty) {
      specialtyCounts[event.payload.specialty] =
        (specialtyCounts[event.payload.specialty] || 0) + 1;
    }
    if (event.payload.topic) {
      tagCounts[event.payload.topic] = (tagCounts[event.payload.topic] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const topSpecialties = Object.entries(specialtyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([specialty, count]) => ({ specialty, count }));

  return { topTags, topSpecialties };
}

export function getRising(rangeDays: number = 7) {
  const events = getEvents();
  const now = Date.now();
  const currentCutoff = now - rangeDays * 24 * 60 * 60 * 1000;
  const previousCutoff = now - 2 * rangeDays * 24 * 60 * 60 * 1000;

  const current = events.filter((e) => e.timestamp >= currentCutoff);
  const previous = events.filter(
    (e) => e.timestamp >= previousCutoff && e.timestamp < currentCutoff
  );

  function countTags(evts: AnalyticsEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of evts) {
      const tags = [...(e.payload.tags || []), e.payload.topic].filter(Boolean);
      for (const tag of tags) {
        counts[tag as string] = (counts[tag as string] || 0) + 1;
      }
    }
    return counts;
  }

  const currentCounts = countTags(current);
  const previousCounts = countTags(previous);

  const rising = Object.entries(currentCounts)
    .map(([tag, count]) => ({
      tag,
      current: count,
      previous: previousCounts[tag] || 0,
      delta: count - (previousCounts[tag] || 0),
    }))
    .filter((r) => r.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  return rising;
}

export function resetAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}

export function seedAnalytics() {
  if (getEvents().length > 0) return;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const seedEvents: AnalyticsEvent[] = [
    { type: "page_view", payload: { section: "triage", tags: ["cardiology", "chest-pain"], specialty: "Cardiology" }, timestamp: now - 1 * day },
    { type: "post_created", payload: { tags: ["cardiology", "heart-failure"], specialty: "Cardiology" }, timestamp: now - 1 * day },
    { type: "post_liked", payload: { tags: ["neurology", "stroke"], specialty: "Neurology" }, timestamp: now - 1 * day },
    { type: "page_view", payload: { section: "news", tags: ["oncology", "immunotherapy"], specialty: "Oncology" }, timestamp: now - 2 * day },
    { type: "news_click", payload: { tags: ["cardiology", "clinical-trials"], specialty: "Cardiology" }, timestamp: now - 2 * day },
    { type: "post_created", payload: { tags: ["emergency-medicine", "sepsis"], specialty: "Emergency Medicine" }, timestamp: now - 2 * day },
    { type: "group_join", payload: { topic: "cardiology", specialty: "Cardiology" }, timestamp: now - 3 * day },
    { type: "event_rsvp", payload: { type: "conference", tags: ["cardiology"], specialty: "Cardiology" }, timestamp: now - 3 * day },
    { type: "page_view", payload: { section: "triage", tags: ["neurology", "seizures"], specialty: "Neurology" }, timestamp: now - 3 * day },
    { type: "post_commented", payload: { tags: ["infectious-disease", "antibiotics"], specialty: "Internal Medicine" }, timestamp: now - 4 * day },
    { type: "chat_opened", payload: { specialty: "Cardiology" }, timestamp: now - 4 * day },
    { type: "news_click", payload: { tags: ["neurology", "alzheimers"], specialty: "Neurology" }, timestamp: now - 4 * day },
    { type: "post_created", payload: { tags: ["cardiology", "arrhythmia"], specialty: "Cardiology" }, timestamp: now - 5 * day },
    { type: "page_view", payload: { section: "news", tags: ["emergency-medicine", "trauma"], specialty: "Emergency Medicine" }, timestamp: now - 5 * day },
    { type: "post_flagged", payload: { tags: ["internal-medicine"], specialty: "Internal Medicine" }, timestamp: now - 5 * day },
    { type: "group_join", payload: { topic: "neurology", specialty: "Neurology" }, timestamp: now - 6 * day },
    { type: "event_rsvp", payload: { type: "grand-rounds", tags: ["heart-failure"], specialty: "Cardiology" }, timestamp: now - 6 * day },
    { type: "page_view", payload: { section: "triage", tags: ["cardiology", "interventional"], specialty: "Cardiology" }, timestamp: now - 6 * day },
    { type: "news_click", payload: { tags: ["oncology", "precision-medicine"], specialty: "Oncology" }, timestamp: now - 1 * day },
    { type: "post_created", payload: { tags: ["neurology", "movement-disorders"], specialty: "Neurology" }, timestamp: now - 2 * day },
    { type: "page_view", payload: { section: "triage", tags: ["cardiology", "valve-disease"], specialty: "Cardiology" }, timestamp: now - 0.5 * day },
    { type: "post_liked", payload: { tags: ["emergency-medicine", "resuscitation"], specialty: "Emergency Medicine" }, timestamp: now - 0.5 * day },
    { type: "news_click", payload: { tags: ["cardiology", "heart-failure", "clinical-trials"], specialty: "Cardiology" }, timestamp: now - 0.5 * day },
    { type: "post_created", payload: { tags: ["infectious-disease", "antimicrobial-resistance"], specialty: "Internal Medicine" }, timestamp: now - 10 * day },
    { type: "post_liked", payload: { tags: ["cardiology", "hypertension"], specialty: "Cardiology" }, timestamp: now - 10 * day },
    { type: "page_view", payload: { section: "news", tags: ["neurology"], specialty: "Neurology" }, timestamp: now - 11 * day },
    { type: "group_join", payload: { topic: "emergency-medicine", specialty: "Emergency Medicine" }, timestamp: now - 12 * day },
  ];

  saveEvents(seedEvents);
}
