import Image from "next/image";
import { HomepageLoadingView } from "@/components/loading";
import {
  JAN_DARPAN_BRAND_ASSETS,
  JAN_DARPAN_LOGO_INTRINSIC,
} from "@/lib/brand/assets";
import { JAN_DARPAN_CHHATTISGARH_TENANT } from "@/lib/tenant/presets/jan-darpan-chhattisgarh";

export default function RootLoading() {
  const name = JAN_DARPAN_CHHATTISGARH_TENANT.branding.nameHi;

  return (
    <div
      className="route-loading route-loading--premium"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="route-loading__brand pl-stagger-item">
        <Image
          src={JAN_DARPAN_BRAND_ASSETS.logo}
          alt={name}
          width={JAN_DARPAN_LOGO_INTRINSIC.width}
          height={JAN_DARPAN_LOGO_INTRINSIC.height}
          priority
          quality={92}
          className="route-loading__logo"
        />
      </div>
      <HomepageLoadingView />
    </div>
  );
}
