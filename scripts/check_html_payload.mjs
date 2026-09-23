import https from "https";

https.get("https://www.jandarpan.news/", (res) => {
  let html = "";
  res.on("data", (c) => (html += c));
  res.on("end", () => {
    let flightChars = 0;
    const regex = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      flightChars += m[1].length;
    }
    console.log("Total HTML length:", html.length, "bytes (~" + (html.length / 1024).toFixed(1) + " KB)");
    console.log("Flight JSON data in HTML:", flightChars, "bytes (~" + (flightChars / 1024).toFixed(1) + " KB)");
  });
});
