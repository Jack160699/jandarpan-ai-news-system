import https from "https";

https.get("https://www.jandarpan.news/", (res) => {
  let html = "";
  res.on("data", (c) => (html += c));
  res.on("end", () => {
    const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
    console.log("Total scripts in homepage HTML:", scripts.length);
    scripts.forEach((s) => console.log("  ", s));

    const stylesheets = [...html.matchAll(/href="([^"]+\.css)"/g)].map((m) => m[1]);
    console.log("Total stylesheets in homepage HTML:", stylesheets.length);
    stylesheets.forEach((s) => console.log("  ", s));
  });
});
