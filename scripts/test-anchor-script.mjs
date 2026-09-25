import { generateAnchorSpokenScript } from "../src/lib/broadcast/anchor-script-engine.js";

const t1 = generateAnchorSpokenScript({
  headline: "दुर्ग में नई सड़क परियोजना को मंजूरी",
  summary: "दुर्ग में नई सड़क परियोजना को मंजूरी मिलने से क्षेत्र के 10 गांवों को सीधा लाभ मिलेगा। नई परियोजना के तहत 25 किलोमीटर लंबी डामर सड़क बनाई जाएगी।",
  language: "hi"
});
console.log("Test 1 (Repeating opening in summary):");
console.log("Script:", t1.script);
console.log("Duration:", t1.durationSec);

const t2 = generateAnchorSpokenScript({
  headline: "सरगुजा में अवैध लकड़ी जब्त, 5 लाख का माल बरामद",
  summary: "वन विभाग के विशेष उड़नदस्ते ने छापेमारी कर तस्करों द्वारा छुपाकर रखी गई इमारती लकड़ी पकड़ी।",
  language: "hi"
});
console.log("\nTest 2 (Distinct overview):");
console.log("Script:", t2.script);
console.log("Duration:", t2.durationSec);
