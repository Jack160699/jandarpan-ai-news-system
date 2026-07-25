import { runWithConcurrency } from "@/lib/infrastructure/concurrency/pool";

export async function prepareEditorialCandidateWaves<TEvent, TPrepared>({
  ranked,
  limit,
  concurrency,
  prepare,
  isCandidate,
}: {
  ranked: TEvent[];
  limit: number;
  concurrency: number;
  prepare: (event: TEvent) => Promise<TPrepared>;
  isCandidate: (prepared: TPrepared) => boolean;
}): Promise<{
  attempted: TEvent[];
  prepared: TPrepared[];
  candidateCount: number;
}> {
  const target = Math.max(0, limit);
  const attempted: TEvent[] = [];
  const prepared: TPrepared[] = [];
  let candidateCount = 0;
  let cursor = 0;

  while (cursor < ranked.length && candidateCount < target) {
    const remaining = target - candidateCount;
    const wave = ranked.slice(cursor, cursor + remaining);
    cursor += wave.length;

    const wavePrepared = await runWithConcurrency(
      wave,
      concurrency,
      prepare
    );

    attempted.push(...wave);
    prepared.push(...wavePrepared);
    candidateCount += wavePrepared.filter(isCandidate).length;
  }

  return { attempted, prepared, candidateCount };
}
