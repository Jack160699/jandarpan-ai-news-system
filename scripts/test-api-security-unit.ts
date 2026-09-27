import { NextRequest } from "next/server";
import { POST, GET } from "../src/app/api/story/engagement/route";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production.local" });

async function runSecurityTests() {
  console.log("=== RUNNING ENGAGEMENT API SECURITY TESTS ===");
  let passed = 0;
  let failed = 0;

  // TEST 1: Unauthenticated Like Creation
  try {
    const req = new NextRequest("http://localhost:3000/api/story/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "like",
        storyId: "45d579ee-cde7-4b14-8244-bacdceeb84e9",
        userId: "hacker_user_123", // Forged userId
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    console.log("Test 1 (Unauthenticated Like): Status =", res.status, "Body =", body);
    if (res.status === 401 && body.ok === false) {
      console.log("✅ PASS: Unauthenticated Like rejected with 401");
      passed++;
    } else {
      console.error("❌ FAIL: Expected 401, got", res.status);
      failed++;
    }
  } catch (e) {
    console.error("Test 1 Error:", e);
    failed++;
  }

  // TEST 2: Unauthenticated Comment Creation
  try {
    const req = new NextRequest("http://localhost:3000/api/story/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "comment",
        storyId: "45d579ee-cde7-4b14-8244-bacdceeb84e9",
        userId: "hacker_user_123",
        userName: "Guest Reader",
        text: "Unauthorized fake comment",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    console.log("Test 2 (Unauthenticated Comment): Status =", res.status, "Body =", body);
    if (res.status === 401 && body.ok === false) {
      console.log("✅ PASS: Unauthenticated Comment rejected with 401");
      passed++;
    } else {
      console.error("❌ FAIL: Expected 401, got", res.status);
      failed++;
    }
  } catch (e) {
    console.error("Test 2 Error:", e);
    failed++;
  }

  // TEST 3: Unauthenticated View Creation
  try {
    const req = new NextRequest("http://localhost:3000/api/story/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "view",
        storyId: "45d579ee-cde7-4b14-8244-bacdceeb84e9",
        playCycleId: "bot_cycle_999",
        userId: "anon_bot_user",
      }),
    });
    const res = await POST(req);
    const body = await res.json();
    console.log("Test 3 (Unauthenticated View): Status =", res.status, "Body =", body);
    if (res.status === 401 && body.ok === false) {
      console.log("✅ PASS: Unauthenticated View rejected with 401");
      passed++;
    } else {
      console.error("❌ FAIL: Expected 401, got", res.status);
      failed++;
    }
  } catch (e) {
    console.error("Test 3 Error:", e);
    failed++;
  }

  // TEST 4: GET Engagement with fake query param userId
  try {
    const req = new NextRequest(
      "http://localhost:3000/api/story/engagement?ids=45d579ee-cde7-4b14-8244-bacdceeb84e9&userId=fake_user"
    );
    const res = await GET(req);
    const body = await res.json();
    console.log("Test 4 (GET Engagement): Status =", res.status, "Data =", body);
    const storyData = body.data?.["45d579ee-cde7-4b14-8244-bacdceeb84e9"];
    if (res.status === 200 && storyData && storyData.user_liked === false) {
      console.log("✅ PASS: Fake query userId was ignored, user_liked is false");
      passed++;
    } else {
      console.error("❌ FAIL on Test 4");
      failed++;
    }
  } catch (e) {
    console.error("Test 4 Error:", e);
    failed++;
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runSecurityTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
