import "../styles/HandPanel.css";

export default function HandPanel({ side, tone, title, role, seen, rows, note, onRowClick }) {
    return (
        <section className={`panel panel-${side} role-${tone}`} aria-label={title}>
            <header className="panel-head">
                <h2 className="panel-title">{title}</h2>
                <p className="panel-role">{role}</p>
                <span className={`seen${seen ? " on" : ""}`}>{seen ? "в кадре" : "не видно"}</span>
            </header>
            <ul className="rows">
                {rows.map((r) => (
                    <li key={r.key} className={r.plain ? "row-plain" : ""}>
                        <button
                            type="button"
                            className={`row${r.active ? " on" : ""}`}
                            onClick={() => onRowClick?.(r)}
                            aria-current={r.active ? "true" : undefined}
                        >
                            <span className="row-finger">{r.finger}</span>
                            <span className="row-value">{r.value}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <p className="panel-note">{note}</p>
        </section>
    );
}
