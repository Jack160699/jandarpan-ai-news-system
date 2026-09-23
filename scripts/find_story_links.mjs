import { chromium } from "playwright";

const executablePath = "C:\\Users\\shriyansh chandrakar\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe";

async function main() {
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto("https://www.jandarpan.news/", { waitUntil: "networkidle" });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href^='/story/']")).map(a => ({
      href: a.getAttribute("href"),
      text: a.innerText.substring(0, 40),
      parentClass: a.parentElement ? a.parentElement.className : "",
      grandparentClass: a.parentElement && a.parentElement.parentElement ? a.parentElement.parentElement.className : "",
    }));
  });

  console.log(`Found ${links.length} story links on page:`);
  links.forEach((l, i) => {
    console.log(`${i + 1}. ${l.href} | Parent: ${l.parentClass} | GP: ${l.grandparentClass}`);
  });

  await browser.close();
}

main().catch(console.error);
