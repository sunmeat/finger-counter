import { useMemo } from "react";
import { ChevronDown, Music2 } from "lucide-react";
import "../styles/InstrumentSelect.css";

const GROUP_ORDER = [
    "Клавишные",
    "Струнные",
    "Духовые",
    "Ударные и перкуссия",
    "Электронные",
];

export default function InstrumentSelect({ options, value, onChange }) {
    const groups = useMemo(
        () => GROUP_ORDER.map((group) => ({
            name: group,
            instruments: options.filter((instrument) => instrument.group === group),
        })).filter((group) => group.instruments.length),
        [options]
    );

    return (
        <label className="instrument-select">
            <span className="instrument-select-icon" aria-hidden="true"><Music2 size={16} /></span>
            <span className="instrument-select-copy">
                <span className="instrument-select-caption">Библиотека звука</span>
                <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Выбрать музыкальный инструмент">
                    {groups.map(({ name, instruments }) => (
                        <optgroup key={name} label={name}>
                            {instruments.map(({ id, name: instrumentName }) => (
                                <option key={id} value={id}>{instrumentName}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </span>
            <span className="instrument-select-count">{options.length}</span>
            <ChevronDown className="instrument-select-chevron" size={16} aria-hidden="true" />
        </label>
    );
}
