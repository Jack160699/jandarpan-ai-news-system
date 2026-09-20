import {  } from "@/lib/ai/providers/codecraft";

async function main() {
  console.log("Testing CodeCraft Connectivity...");
  try {
    const result = await ({
      prompt: "Hello, this is a connectivity test.",
      system: "You are an assistant.",
    }, {
      model: "codecraft-1",
      operation: "connectivity_test",
      timeoutMs: 10000
    });
    console.log("Result:", result.text);
    console.log("Connectivity OK");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
