import { useMemo, useState } from "react";
import "../styles/InstrumentSelect.css";

const GROUP_ORDER = [
    "Клавишные",
    "Струнные",
    "Духовые",
    "Ударные и перкуссия",
    "Электронные",
];

const GROUP_ART = {
    "Клавишные": "🎹",
    "Струнные": "🎸",
    "Духовые": "🎷",
    "Ударные и перкуссия": "🥁",
    "Электронные": "🎛️",
};

const INSTRUMENT_ART = {
    piano: "🎹", electric: "🎹", "digital-piano": "🎹", celesta: "🎹",
    marimba: "🪵", vibraphone: "🔔", kalimba: "🎼", "music-box": "🎁",
    handpan: "🥣", "tongue-drum": "🥁",
    ukulele: "🎸", "acoustic-guitar": "🎸", nylon: "🎸", harp: "🎼",
    koto: "🎼", shamisen: "🎸", sitar: "🎸", banjo: "🪕", mandolin: "🎸",
    sopilka: "🪈", "pan-flute": "🪈", flute: "🪈", recorder: "🪈",
    clarinet: "🎶", oboe: "🎶", saxophone: "🎷", trumpet: "🎺", "french-horn": "📯",
    wavetable: "〰️", "soft-pad": "🌌", "analog-lead": "🎚️", "retro-synth": "🎛️",
    brass: "🎺", choir: "🎙️",
};

export default function InstrumentSelect({ options, value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const groups = useMemo(
        () => GROUP_ORDER.map((group) => ({
            name: group,
            instruments: options.filter((instrument) => instrument.group === group),
        })).filter((group) => group.instruments.length),
        [options]
    );
    const selected = options.find((instrument) => instrument.id === value) ?? options[0];

    function chooseInstrument(id) {
        onChange(id);
        setIsOpen(false);
    }

    return (
        <div className={`instrument-picker${isOpen ? " is-open" : ""}`}>
            <button
                className="instrument-select"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
            >
                <span className="instrument-select-art" aria-hidden="true">{INSTRUMENT_ART[selected?.id] ?? "♫"}</span>
                <span className="instrument-select-copy">
                    <span className="instrument-select-caption">БИБЛИОТЕКА ЗВУКА <span className="instrument-select-count">{options.length}</span></span>
                    <span className="instrument-select-current">{selected?.name ?? "Выбрать инструмент"}</span>
                </span>
                <span className="instrument-select-chevron" aria-hidden="true"><span /></span>
            </button>

            {isOpen && (
                <>
                    <button className="instrument-picker-backdrop" type="button" aria-label="Закрыть список инструментов" onClick={() => setIsOpen(false)} />
                    <div className="instrument-picker-menu" role="listbox" aria-label="Музыкальные инструменты">
                        <div className="instrument-picker-heading">
                            <div>
                                <span className="instrument-picker-eyebrow">ВЫБЕРИ СВОЁ ЗВУЧАНИЕ</span>
                                <h2>Инструменты</h2>
                            </div>
                            <span className="instrument-picker-total">{options.length} тембра</span>
                        </div>
                        {groups.map(({ name, instruments }) => (
                            <section className="instrument-picker-group" key={name}>
                                <h3><span aria-hidden="true">{GROUP_ART[name]}</span>{name}<span>{instruments.length}</span></h3>
                                <div className="instrument-picker-grid">
                                    {instruments.map(({ id, name: instrumentName }) => (
                                        <button
                                            className={`instrument-option${id === value ? " is-selected" : ""}`}
                                            type="button"
                                            role="option"
                                            aria-selected={id === value}
                                            key={id}
                                            onClick={() => chooseInstrument(id)}
                                        >
                                            <span className="instrument-option-art" aria-hidden="true">{INSTRUMENT_ART[id] ?? "♫"}</span>
                                            <span className="instrument-option-name">{instrumentName}</span>
                                            {id === value && <span className="instrument-option-check" aria-hidden="true">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
