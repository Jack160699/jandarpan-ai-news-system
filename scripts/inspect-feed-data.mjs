async function check() {
  const res = await fetch("https://www.jandarpan.news");
  const html = await res.text();
  
  // Find article objects in the SSR HTML payload
  const matches = [...html.matchAll(/"headline":"([^"]+)"[\s\S]*?"imageUrl":"([^"]+)"/g)];
  console.log(`Found ${matches.length} headline -> imageUrl matches:`);
  for (let i = 0; i < Math.min(20, matches.length); i++) {
    console.log(`${i + 1}. [${matches[i][1].slice(0, 45)}] --> ${matches[i][2]}`);
  }
}
check();
