import "./styles/InstrumentSelect.css";

export default function InstrumentSelect({ options, value, onChange }) {
    return (
        <label className="instrument-select">
            <span>Инструмент</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Инструмент">
                {options.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
        </label>
    );
}
