/**
 * Invalidate homepage cache after ingestion — ISR + Redis
 */

import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";

export function revalidateLiveHomepage(): void {
  void revalidateNewsroomCaches();
}
