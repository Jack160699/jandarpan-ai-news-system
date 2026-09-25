async function check() {
  const res = await fetch("https://www.jandarpan.news");
  const html = await res.text();
  
  // Unescape backslashes in Next.js stream chunks
  const unescaped = html.replace(/\\"/g, '"').replace(/\\\//g, '/');
  
  const regex = /"imageUrl":"([^"]+)"/g;
  let match;
  const list = [];
  while ((match = regex.exec(unescaped)) !== null) {
    list.push(match[1]);
  }
  console.log("Found imageUrls after unescaping:", list.length);
  const unique = [...new Set(list)];
  console.log("Unique imageUrls:", unique.length);
  unique.forEach((u, i) => console.log(i + 1, u));

  const regex2 = /"headline":"([^"]+)"[\s\S]*?"imageUrl":"([^"]+)"/g;
  let match2;
  console.log("\nHeadline -> imageUrl mapping:");
  let count = 0;
  while ((match2 = regex2.exec(unescaped)) !== null && count < 20) {
    console.log(++count, match2[1].slice(0, 45), "==>", match2[2]);
  }
}
check();
