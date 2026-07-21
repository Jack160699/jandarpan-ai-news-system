import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { SignInPage } from "@/features/reader-ds/experience";
import LegacyLoginPage from "./LegacyLoginPage";

/**
 * Reader login — Plot D28 when NEXT_PUBLIC_READER_DS=1; legacy UI otherwise.
 */
export default function LoginPage() {
  if (isReaderDesignSystemEnabled()) {
    return <SignInPage />;
  }
  return <LegacyLoginPage />;
}
