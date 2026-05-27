import type { ContentPlugin } from "@kakimon/plugin-api";
import { validateManifest } from "@kakimon/plugin-api";
import hiraganaPlugin from "@kakimon/plugin-writing-hiragana";

// 起動時に各プラグインのマニフェストを検証し、重複 ID も弾く。
// 不正な 1 つで全体を落とすと開発体験が悪いため、検証失敗は console.error
// に記録した上でそのプラグインだけスキップする。
function buildRegistry(candidates: ContentPlugin[]): ContentPlugin[] {
  const accepted: ContentPlugin[] = [];
  const seen = new Set<string>();
  for (const p of candidates) {
    try {
      validateManifest(p.manifest);
    } catch (e) {
      console.error(
        `[plugin-host] manifest validation failed, skipping plugin:`,
        e
      );
      continue;
    }
    if (seen.has(p.manifest.id)) {
      console.error(
        `[plugin-host] duplicate plugin id ${p.manifest.id}, skipping`
      );
      continue;
    }
    seen.add(p.manifest.id);
    accepted.push(p);
  }
  return accepted;
}

export const plugins: readonly ContentPlugin[] = buildRegistry([
  hiraganaPlugin,
]);

export function findPlugin(id: string): ContentPlugin | undefined {
  return plugins.find((p) => p.manifest.id === id);
}
