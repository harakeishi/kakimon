import type { ContentPlugin } from "@kakimon/plugin-api";
import { validateManifest } from "@kakimon/plugin-api";
import hiraganaPlugin from "@kakimon/plugin-writing-hiragana";

const builtin: ContentPlugin[] = [hiraganaPlugin];

// 起動時にマニフェスト検証 + id 重複チェック
const seen = new Set<string>();
for (const p of builtin) {
  validateManifest(p.manifest);
  if (seen.has(p.manifest.id)) {
    throw new Error(`duplicate plugin id at registry: ${p.manifest.id}`);
  }
  seen.add(p.manifest.id);
}

export const plugins: readonly ContentPlugin[] = builtin;

export function findPlugin(id: string): ContentPlugin | undefined {
  return plugins.find((p) => p.manifest.id === id);
}
