async function testGoogle() {
  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=502200355392-nrgkiqga2hgbm3k5qspaso3c38btrje3.apps.googleusercontent.com&redirect_to=https%3A%2F%2Fwww.jandarpan.news%2Fauth%2Fcallback&redirect_uri=https%3A%2F%2Fgiiuqshoconjbpiueasp.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&state=test";
  const res = await fetch(url);
  const text = await res.text();
  const clean = text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  console.log("Full Visible Text:", clean);
}
testGoogle();
