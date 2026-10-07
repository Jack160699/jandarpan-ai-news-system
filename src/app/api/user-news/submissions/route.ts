import { json, readJson, respond, withReader } from "@/lib/user-news/http";
import { CreateSubmissionSchema } from "@/lib/user-news/schemas";
import { createSubmission } from "@/lib/user-news/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/user-news/submissions — start a story (verified users only). The author is the signed-in user; it cannot be supplied. */
export async function POST(request: Request) {
  const body = await readJson(request, CreateSubmissionSchema);
  if (!body.ok) return body.response;
  return withReader(async (user, deps) => {
    const r = await createSubmission(deps, user.id, body.data);
    return r.ok ? json({ ok: true, id: r.submission.id, status: r.submission.status }, 201) : respond(r);
  });
}
