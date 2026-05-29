import { Link, useNavigate } from "react-router-dom";
import { plugins } from "../../plugin-host/registry";

export function StudySelectScreen() {
  const navigate = useNavigate();

  return (
    <>
      <header className="row">
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>
          ← もどる
        </button>
        <h1 style={{ margin: 0, marginLeft: 12 }}>べんきょう</h1>
      </header>

      <div className="list">
        {plugins.map((p) => (
          <Link
            key={p.manifest.id}
            to={`/study/${encodeURIComponent(p.manifest.id)}`}
            className="plugin-card"
          >
            <div className="icon" aria-hidden>
              {p.manifest.icon}
            </div>
            <div>
              <strong>{p.manifest.name}</strong>
              <div className="desc">{p.manifest.description}</div>
            </div>
            <div>▶</div>
          </Link>
        ))}
        {plugins.length === 0 && (
          <div className="card center">
            まだ プラグインが ないみたい
          </div>
        )}
      </div>
    </>
  );
}
