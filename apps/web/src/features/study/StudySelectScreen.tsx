import { Link, useNavigate } from "react-router-dom";
import type { ContentPlugin } from "@kakimon/plugin-api";
import { plugins } from "../../plugin-host/registry";
import { PluginIcon } from "../../components/PluginIcon";

function ageLabel(p: ContentPlugin): string {
  const min = p.manifest.ageHint?.min;
  return min ? `${min}さいから` : "";
}

export function StudySelectScreen() {
  const navigate = useNavigate();
  // 「3さいから」= kidsMode。字が読めなくても選べるよう、絵だけの大きなカード。
  const kids = plugins.filter((p) => p.manifest.kidsMode);
  const older = plugins.filter((p) => !p.manifest.kidsMode);
  // 見出しの年齢は、その枠でいちばん低い ageHint から出す（カードの表示と
  // 食い違わないように）。ageHint が無いプラグインだけなら数字を出さない。
  const olderMin = older.reduce<number | null>((min, p) => {
    const m = p.manifest.ageHint?.min;
    if (m === undefined) return min;
    return min === null ? m : Math.min(min, m);
  }, null);

  return (
    <>
      <header className="row">
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>
          ← もどる
        </button>
        <h1 style={{ margin: 0, marginLeft: 12 }}>べんきょう</h1>
      </header>

      {kids.length > 0 && (
        <>
          <div className="section-title">
            <span className="age-badge">3さいから</span>
            <span>タッチで あそぼう</span>
          </div>
          <div className="kids-grid">
            {kids.map((p) => (
              <Link
                key={p.manifest.id}
                to={`/study/${encodeURIComponent(p.manifest.id)}`}
                className="kids-card"
                aria-label={p.manifest.name}
              >
                <span className="kids-card__icon">
                  <PluginIcon icon={p.manifest.icon} size={64} />
                </span>
                <span>{p.manifest.name}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {older.length > 0 && (
        <>
          <div className="section-title">
            <span className="age-badge age-badge--older">
              {olderMin === null ? "おおきい こ" : `${olderMin}さいから`}
            </span>
            <span>かいたり こたえたり</span>
          </div>
          <div className="list">
            {older.map((p) => (
              <Link
                key={p.manifest.id}
                to={`/study/${encodeURIComponent(p.manifest.id)}`}
                className="plugin-card"
              >
                <div className="icon" aria-hidden>
                  <PluginIcon icon={p.manifest.icon} size={36} />
                </div>
                <div>
                  <strong>{p.manifest.name}</strong>
                  <div className="desc">
                    {p.manifest.description}
                    {ageLabel(p) ? `・${ageLabel(p)}` : ""}
                  </div>
                </div>
                <div>▶</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {plugins.length === 0 && (
        <div className="card center">まだ プラグインが ないみたい</div>
      )}
    </>
  );
}
