import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.production.local" });

import { NextRequest } from "next/server";

async function test() {
  const { GET, POST } = await import("@/app/api/story/engagement/route");
  const { GET: getComments } = await import("@/app/api/story/engagement/comments/route");

  console.log("Testing Story Engagement APIs...");

  // 1. Initial GET
  const req1 = new NextRequest("http://localhost:3000/api/story/engagement?ids=story-unit-test");
  const res1 = await GET(req1);
  const data1 = await res1.json();
  console.log("1. Initial GET response:", data1);

  // 2. Record View
  const req2 = new NextRequest("http://localhost:3000/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "view",
      storyId: "story-unit-test",
      playCycleId: `cycle-unit-test-${Date.now()}`,
    }),
  });
  const res2 = await POST(req2);
  const data2 = await res2.json();
  console.log("2. Record View response:", data2);

  // 3. Repeat View with same cycle (idempotency check)
  const req2b = new NextRequest("http://localhost:3000/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "view",
      storyId: "story-unit-test",
      playCycleId: `cycle-unit-test-fixed-1`,
    }),
  });
  const res2b_1 = await POST(req2b);
  const data2b_1 = await res2b_1.json();
  console.log("3a. First View for fixed cycle:", data2b_1);

  const res2b_2 = await POST(req2b);
  const data2b_2 = await res2b_2.json();
  console.log("3b. Duplicate View for fixed cycle (Idempotency):", data2b_2);

  // 4. Toggle Like
  const req3 = new NextRequest("http://localhost:3000/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "like",
      storyId: "story-unit-test",
      userId: "user-unit-test",
    }),
  });
  const res3 = await POST(req3);
  const data3 = await res3.json();
  console.log("4. Like response:", data3);

  // 5. Add Comment
  const req4 = new NextRequest("http://localhost:3000/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "comment",
      storyId: "story-unit-test",
      userId: "user-unit-test",
      userName: "श्रीयांश",
      text: "शानदार रिपोर्टिंग, जन दर्पण!",
    }),
  });
  const res4 = await POST(req4);
  const data4 = await res4.json();
  console.log("5. Comment response:", data4);

  // 6. Get Comments
  const req5 = new NextRequest("http://localhost:3000/api/story/engagement/comments?storyId=story-unit-test");
  const res5 = await getComments(req5);
  const data5 = await res5.json();
  console.log("6. Get Comments response:", data5);

  // 7. Final GET engagement
  const req6 = new NextRequest("http://localhost:3000/api/story/engagement?ids=story-unit-test&userId=user-unit-test");
  const res6 = await GET(req6);
  const data6 = await res6.json();
  console.log("7. Final GET response:", data6);
}

test().catch(console.error);
