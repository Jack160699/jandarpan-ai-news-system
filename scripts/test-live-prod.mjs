async function testLiveProd() {
  console.log("=== TESTING LIVE PRODUCTION ENGAGEMENT API ===");

  // 1. GET counts
  const getRes = await fetch("https://www.jandarpan.news/api/story/engagement?ids=45d579ee-cde7-4b14-8244-bacdceeb84e9");
  console.log("GET Status:", getRes.status);
  const getData = await getRes.json();
  console.log("GET Heavy Rain Counts:", JSON.stringify(getData));

  // 2. Unauthenticated POST like (Must be rejected with 401!)
  const postLikeRes = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "like",
      storyId: "45d579ee-cde7-4b14-8244-bacdceeb84e9",
      userId: "fake_hacker_user",
    }),
  });
  console.log("Unauthenticated POST Like Status:", postLikeRes.status);
  const postLikeData = await postLikeRes.json();
  console.log("Unauthenticated POST Like Body:", JSON.stringify(postLikeData));

  // 3. Unauthenticated POST comment (Must be rejected with 401!)
  const postCommentRes = await fetch("https://www.jandarpan.news/api/story/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "comment",
      storyId: "45d579ee-cde7-4b14-8244-bacdceeb84e9",
      userId: "fake_hacker_user",
      userName: "Guest Reader",
      text: "Unauthenticated test comment",
    }),
  });
  console.log("Unauthenticated POST Comment Status:", postCommentRes.status);
  const postCommentData = await postCommentRes.json();
  console.log("Unauthenticated POST Comment Body:", JSON.stringify(postCommentData));
}

testLiveProd().catch(console.error);
