import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { StateBody } from "./StateBody";

/** F53 — planned maintenance. */
export function MaintenancePage({
  etaLabel = "जल्द",
}: {
  etaLabel?: string;
}) {
  return (
    <ReaderShell hideBottomNav reserveMiniPlayer={false} showPermissionSheets={false}>
      <Masthead hideActions />
      <StateBody
        icon="cog"
        round
        title="हम जल्द लौट रहे हैं"
        body={`जनदर्पण को बेहतर बनाने के लिए कुछ नियोजित रखरखाव चल रहा है। अनुमानित वापसी: ${etaLabel}।`}
        primary={{ label: "स्थिति पृष्ठ देखें", href: "/contact" }}
        secondary={{ label: "होम पर प्रयास करें", href: "/" }}
      />
    </ReaderShell>
  );
}
