async function test() {
  const resHome = await fetch('https://www.jandarpan.news/home');
  const htmlHome = await resHome.text();
  const storyLinksHome = Array.from(htmlHome.matchAll(/href="(\/story\/[^"]+)"/g)).map(m => m[1]);
  console.log('Story links from /home:', Array.from(new Set(storyLinksHome)));

  const resLatest = await fetch('https://www.jandarpan.news/latest');
  const htmlLatest = await resLatest.text();
  const storyLinksLatest = Array.from(htmlLatest.matchAll(/href="(\/story\/[^"]+)"/g)).map(m => m[1]);
  console.log('Story links from /latest:', Array.from(new Set(storyLinksLatest)));
}
test();
