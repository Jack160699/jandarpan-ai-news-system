import type { EventGraphEdge, EventGraphNode } from "@/lib/intelligence/types";

export function buildEventRelationshipGraph(
  events: Array<{
    id: string;
    canonical_title: string;
    region: string | null;
    category: string | null;
    signal_ids: string[];
    urgency_score: number;
  }>
): { nodes: EventGraphNode[]; edges: EventGraphEdge[] } {
  const nodes: EventGraphNode[] = events.map((e) => ({
    eventId: e.id,
    title: e.canonical_title,
    urgencyScore: Number(e.urgency_score),
    signalCount: e.signal_ids?.length ?? 0,
    region: e.region,
    category: e.category,
  }));

  const edges: EventGraphEdge[] = [];
  const signalToEvents = new Map<string, string[]>();

  for (const e of events) {
    for (const sid of e.signal_ids ?? []) {
      const list = signalToEvents.get(sid) ?? [];
      list.push(e.id);
      signalToEvents.set(sid, list);
    }
  }

  for (const eventIds of signalToEvents.values()) {
    if (eventIds.length < 2) continue;
    for (let i = 0; i < eventIds.length; i++) {
      for (let j = i + 1; j < eventIds.length; j++) {
        edges.push({
          fromEventId: eventIds[i],
          toEventId: eventIds[j],
          relationship: "shared_signal",
          weight: 0.85,
        });
      }
    }
  }

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.region && a.region === b.region && a.category === b.category) {
        edges.push({
          fromEventId: a.id,
          toEventId: b.id,
          relationship: "same_region_category",
          weight: 0.45,
        });
      }
    }
  }

  return { nodes, edges: dedupeEdges(edges).slice(0, 80) };
}

function dedupeEdges(edges: EventGraphEdge[]): EventGraphEdge[] {
  const seen = new Set<string>();
  return edges.filter((e) => {
    const key = [e.fromEventId, e.toEventId].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
