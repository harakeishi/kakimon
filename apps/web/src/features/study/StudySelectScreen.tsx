import { Link, useNavigate } from "react-router-dom";
import type { ContentPlugin } from "@kakimon/plugin-api";
import { plugins } from "../../plugin-host/registry";
import { EmojiIcon } from "../../components/EmojiIcon";

/**
 * manifest.icon は絵文字か短い文字（"あ"・"1" など）。絵文字なら OpenMoji の
 * 画像、文字ならそのまま大きく出す。
 */
function PluginIcon({ icon, size }: { icon: string; size: number }) {
  const cp = icon.codePointAt(0) ?? 0;
  const isEmoji = cp > 0x2000;
  return isEmoji ? (
    <EmojiIcon emoji={icon} size={size} alt="" />
  ) : (
    <span aria-hidden>{icon}</span>
  );
}

function ageLabel(p: ContentPlugin): string {
  const min = p.manifest.ageHint?.min;
  return min ? `${min}さいから` : "";
}

export function StudySelectScreen() {
  const navigate = useNavigate();
  // 「3さいから」= kidsMode。字が読めなくても選べるよう、絵だけの大きなカード。
  const kids = plugins.filter((p) => p.manifest.kidsMode);
  const older = plugins.filter((p) => !p.manifest.kidsMode);

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
            <span className="age-badge age-badge--older">4さいから</span>
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
