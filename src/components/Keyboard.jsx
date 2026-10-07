import { NOTE_NAMES } from "../piano.js";
import { BLACK_PITCHES, KEY_FROM, KEY_TO } from "../constants.js";

const ALL_KEYS = Array.from({ length: KEY_TO - KEY_FROM + 1 }, (_, i) => KEY_FROM + i);
const WHITE_KEYS = ALL_KEYS.filter((m) => !BLACK_PITCHES.includes(m % 12));
const BLACK_WIDTH = (100 / WHITE_KEYS.length) * 0.6;

const BLACK_KEYS = ALL_KEYS
    .filter((m) => BLACK_PITCHES.includes(m % 12))
    .map((m) => ({
        m,
        left: ((WHITE_KEYS.indexOf(m - 1) + 1) / WHITE_KEYS.length) * 100 - BLACK_WIDTH / 2,
    }));

export default function Keyboard({ midi, roots }) {
    const sounding = new Set(midi);
    const rootSet = new Set(roots);

    const keyClass = (m, base) =>
        `key ${base}${rootSet.has(m) ? " root" : sounding.has(m) ? " tone" : ""}`;

    const names = midi.map((m) => NOTE_NAMES[m % 12]).join(", ");

    return (
        <div className="keys" role="img" aria-label={midi.length ? `Нажаты клавиши: ${names}` : "Клавиши не нажаты"}>
            {WHITE_KEYS.map((m) => (
                <div key={m} className={keyClass(m, "white")}>
                    {m % 12 === 0 && <span className="key-c">до</span>}
                </div>
            ))}

            {BLACK_KEYS.map(({ m, left }) => (
                <div
                    key={m}
                    className={keyClass(m, "black")}
                    style={{ left: `${left}%`, width: `${BLACK_WIDTH}%` }}
                />
            ))}
        </div>
    );
}
