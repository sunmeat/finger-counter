export default function Segmented({ label, options, value, onChange }) {
    return (
        <div className="tool-group" role="group" aria-label={label}>
            {options.map(({ id, name }) => (
                <button
                    key={id}
                    type="button"
                    className={`tool${id === value ? " on" : ""}`}
                    aria-pressed={id === value}
                    onClick={() => onChange(id)}
                >
                    {name}
                </button>
            ))}
        </div>
    );
}
