import { registerSW } from "virtual:pwa-register";

// 定期的に更新をチェックする間隔（1時間）
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Service Worker を登録し、更新チェックをセットアップする。
 *
 * vite.config.ts では `registerType: "autoUpdate"` を指定しているため、
 * 新しい Service Worker が見つかると自動で有効化されページが再読み込みされる。
 *
 * ただし Service Worker の更新チェックは通常ページ読み込み時にしか走らない。
 * iOS の「ホーム画面に追加」した PWA（standalone）は、アプリスイッチャーから
 * 復帰してもページを再読み込みしないため、明示的にチェックしないと
 * いつまでも古いバージョンが使われ続けてしまう。
 *
 * そこで以下の2つのタイミングで明示的に更新チェックを行う:
 *   1. アプリがフォアグラウンドに戻ったとき（visibilitychange）
 *   2. 一定間隔ごと（起動しっぱなしのケース対策）
 */
export function setupPWA(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        // オフライン時など失敗しても無視する
        void registration.update().catch(() => {});
      };

      // 一定間隔ごとに更新をチェック
      setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

      // アプリがフォアグラウンドに戻ったときにチェック（iOS standalone 対策）
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate();
        }
      });
    },
  });
}
