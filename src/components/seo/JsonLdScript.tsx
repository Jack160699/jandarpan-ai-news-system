import { jsonLdScriptPayload } from "@/lib/seo/json-ld";

type JsonLdScriptProps = {
  data: unknown | unknown[];
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScriptPayload(data) }}
    />
  );
}
