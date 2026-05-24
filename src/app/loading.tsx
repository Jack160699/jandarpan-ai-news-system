import Image from "next/image";
import { HomepageLoadingView } from "@/components/loading";

export default function RootLoading() {
  return (
    <div
      className="route-loading route-loading--premium"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="route-loading__brand pl-stagger-item">
        <Image
          src="/brand/jan-darpan-chhattisgarh-logo.png"
          alt="जन दर्पण छत्तीसगढ़"
          width={420}
          height={84}
          priority
          quality={92}
          className="route-loading__logo"
        />
      </div>
      <HomepageLoadingView />
    </div>
  );
}
