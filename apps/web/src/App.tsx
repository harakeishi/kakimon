import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useGameStore } from "./state/gameStore";
import { HomeScreen } from "./features/home/HomeScreen";
import { StudySelectScreen } from "./features/study/StudySelectScreen";
import { StudyPlayScreen } from "./features/study/StudyPlayScreen";
import { StudyResultScreen } from "./features/study/StudyResultScreen";
import { ShopScreen } from "./features/shop/ShopScreen";

export function App() {
  const init = useGameStore((s) => s.init);
  const ready = useGameStore((s) => s.ready);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="card center">
          <div className="big-emoji">🥚</div>
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
        <Route path="*" element={<HomeScreen />} />
      </Routes>
    </div>
  );
}
