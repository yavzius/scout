import { getCacheStats, clearCache, CACHE_DIR } from "../lib/cache.js";
import { printCacheStats } from "../lib/output.js";

export function run(action: string | undefined, json: boolean): void {
  if (action === "clear") {
    const count = clearCache();
    if (json) {
      console.log(JSON.stringify({ cleared: count }));
    } else {
      console.log(count > 0 ? `Cleared ${count} cached extraction(s).` : "Cache is empty.");
    }
    return;
  }

  const stats = getCacheStats();
  printCacheStats(stats, CACHE_DIR, json);
}
