/**
 * Admin-requested audio regeneration.
 *
 * Audio rows are keyed by (article, language, kind, style, voice model, voice name), so "regenerate" never creates a duplicate and never
 * re-bills a configuration that already produced valid audio: a `ready` row is a cache hit and is left alone. Only `failed` / `invalid`
 * rows are put back in the queue (attempts reset, backoff cleared) for the normal worker to pick up. This function never calls a TTS
 * provider itself, so it cannot spend money or block anything; it is pure queue bookkeeping.
 */

export type AudioQueueRow = { id: string; article_id: string; language: string; script_kind: string; status: "pending" | "generating" | "ready" | "failed" | "invalid" };

export interface AudioRegenerateRepo {
  listForArticle(articleId: string): Promise<AudioQueueRow[]>;
  requeue(ids: string[]): Promise<number>;
  audit(event: { actor_id: string; actor_kind: "admin"; action: string; entity_type: string; entity_id: string; detail: Record<string, unknown> }): Promise<void>;
}

export type RegenerateResult =
  | { ok: true; requeued: number; alreadyReady: number; inProgress: number; nothingToDo: boolean }
  | { ok: false; code: "no_audio_rows"; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export async function regenerateArticleAudio(repo: AudioRegenerateRepo, actorId: string, articleId: string, opts: { language?: string; kind?: string } = {}): Promise<RegenerateResult> {
  const all = await repo.listForArticle(articleId);
  const rows = all.filter((r) => (!opts.language || r.language === opts.language) && (!opts.kind || r.script_kind === opts.kind));
  if (!rows.length) return { ok: false, code: "no_audio_rows", message: "No audio has been queued for this story yet. The worker enqueues new stories on its own." };

  const retry = rows.filter((r) => r.status === "failed" || r.status === "invalid");
  const requeued = retry.length ? await repo.requeue(retry.map((r) => r.id)) : 0;
  const result = {
    requeued,
    alreadyReady: rows.filter((r) => r.status === "ready").length,
    inProgress: rows.filter((r) => r.status === "pending" || r.status === "generating").length,
  };
  await repo.audit({ actor_id: actorId, actor_kind: "admin", action: "audio.regenerate_requested", entity_type: "article_audio", entity_id: articleId, detail: { ...result, language: opts.language ?? null, kind: opts.kind ?? null } });
  return { ok: true, ...result, nothingToDo: requeued === 0 };
}
