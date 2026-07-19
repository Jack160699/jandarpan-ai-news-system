import { StateBody } from "./StateBody";

/** F47 — friendly empty guidance (saved / followed / etc.). */
export function EmptyState({
  title = "अभी तक कुछ सहेजा नहीं",
  body = "किसी भी लेख पर सहेजें दबाएँ — वे यहाँ पढ़ने के लिए, ऑफ़लाइन भी, जमा होंगे।",
  primaryLabel = "ख़बरें देखें",
  primaryHref = "/",
}: {
  title?: string;
  body?: string;
  primaryLabel?: string;
  primaryHref?: string;
}) {
  return (
    <StateBody
      icon="bookmark"
      title={title}
      body={body}
      primary={{ label: primaryLabel, href: primaryHref }}
    />
  );
}
