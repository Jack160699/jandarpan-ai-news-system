import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0];
  const pages = context.pages();
  console.log("Pages count:", pages.length);
  const gaPage = pages.find((p) => p.url().includes("analytics.google.com"));
  if (!gaPage) {
    console.log("No GA page found among open pages.");
    return;
  }
  console.log("Found GA page:", gaPage.url());
  const elements = await gaPage.evaluate(() => {
    return Array.from(document.querySelectorAll("*"))
      .filter((el) => {
        const text = el.innerText || "";
        return (
          text.includes("Industry category") ||
          text.includes("Select one") ||
          el.getAttribute("role") === "combobox" ||
          el.tagName === "SELECT" ||
          el.tagName.toLowerCase().includes("select")
        );
      })
      .map((el) => ({
        tag: el.tagName,
        role: el.getAttribute("role"),
        class: el.className,
        text: el.innerText?.slice(0, 100),
        id: el.id,
      }));
  });
  console.log("Matching elements:", elements.slice(0, 15));

  await gaPage.screenshot({ path: "ga_current_state.png" });
  console.log("Screenshot saved to ga_current_state.png");
  browser.close();
}

main().catch(console.error);
