import { chromium } from "playwright";

async function inspect() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("https://www.jandarpan.news", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("main h1, main h2, main h3, main section, main aside, main div[class*='col'], main div[class*='feed'], main div[class*='update'], main div[class*='article'], main div[class*='card']")).map(el => ({
      tag: el.tagName,
      className: typeof el.className === "string" ? el.className : "",
      text: el.innerText ? el.innerText.slice(0, 80).replace(/\n/g, " ") : ""
    })).filter(x => x.text.length > 0).slice(0, 40);
  });

  console.log("Sections found on Live page:");
  console.log(JSON.stringify(elements, null, 2));

  // Let's also check all links and text in the body
  const allHeadings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => ({
      tag: h.tagName,
      text: h.innerText.replace(/\n/g, " ").trim(),
      className: h.className
    }));
  });
  console.log("All headings:", JSON.stringify(allHeadings, null, 2));

  await browser.close();
}

inspect().catch(console.error);
