import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useGameStore } from "./state/gameStore";
import { HomeScreen } from "./features/home/HomeScreen";
import { StudySelectScreen } from "./features/study/StudySelectScreen";
import { StudyPlayScreen } from "./features/study/StudyPlayScreen";
import { StudyResultScreen } from "./features/study/StudyResultScreen";
import { ShopScreen } from "./features/shop/ShopScreen";
import { ClosetScreen } from "./features/closet/ClosetScreen";
import { AdminMode } from "./features/admin/AdminMode";
import { EmojiIcon } from "./components/EmojiIcon";

export function App() {
  const init = useGameStore((s) => s.init);
  const tick = useGameStore((s) => s.tick);
  const ready = useGameStore((s) => s.ready);

  useEffect(() => {
    void init();
  }, [init]);

  // tick の自動駆動：定期 + 復帰時。
  // - 60 秒ごとに最新化（dying/deceased の検知をリアクティブに）
  // - 別タブから戻ったとき・モバイルから復帰したときも即座に評価
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void tick();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, tick]);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="card center">
          <EmojiIcon emoji="🥚" size={72} alt="" />
          <p>よみこみちゅう…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/study" element={<StudySelectScreen />} />
        <Route path="/study/:pluginId" element={<StudyPlayScreen />} />
        <Route path="/study/result" element={<StudyResultScreen />} />
        <Route path="/shop" element={<ShopScreen />} />
        <Route path="/closet" element={<ClosetScreen />} />
        <Route path="*" element={<HomeScreen />} />
      </Routes>
      <AdminMode />
    </div>
  );
}
