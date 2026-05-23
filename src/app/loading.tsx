import Image from "next/image";
import { HomepageSkeleton } from "@/sections/homepage";

export default function RootLoading() {
  return (
    <div className="route-loading" aria-busy="true" aria-label="Loading">
      <div className="route-loading__brand">
        <Image
          src="/brand/jan-darpan-chhattisgarh-logo.png"
          alt="जन दर्पण छत्तीसगढ़"
          width={280}
          height={56}
          priority
          className="route-loading__logo"
        />
      </div>
      <HomepageSkeleton />
    </div>
  );
}
