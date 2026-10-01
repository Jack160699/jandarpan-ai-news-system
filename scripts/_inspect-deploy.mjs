import { execSync } from "node:child_process";

for (const id of process.argv.slice(2)) {
  const raw = execSync(`npx vercel inspect ${id} --json`, { encoding: "utf8" });
  const start = raw.indexOf("{");
  const j = JSON.parse(raw.slice(start));
  const meta = j.deployment?.meta || j.meta || {};
  console.log(
    JSON.stringify(
      {
        id: j.deployment?.id || j.id || id,
        url: j.deployment?.url || j.url,
        readyState: j.deployment?.readyState || j.readyState,
        githubCommitSha: meta.githubCommitSha || meta.githubCommitSha || null,
        gitCommitSha: meta.gitCommitSha || null,
        githubCommitRef: meta.githubCommitRef || null,
        metaKeys: Object.keys(meta).slice(0, 40),
      },
      null,
      2
    )
  );
}
