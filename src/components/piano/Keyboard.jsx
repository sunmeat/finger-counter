import { NOTE_NAMES } from "../../piano.js";
import { BLACK_PITCHES, KEY_FROM, KEY_TO } from "../../constants.js";
import "./styles/Keyboard.css";

const ALL_KEYS = Array.from({ length: KEY_TO - KEY_FROM + 1 }, (_, i) => KEY_FROM + i);
const WHITE_KEYS = ALL_KEYS.filter((m) => !BLACK_PITCHES.includes(m % 12));
const KEYBED_INSET = 4;
const KEYBED_WIDTH = 100 - KEYBED_INSET * 2;
const BLACK_WIDTH = (KEYBED_WIDTH / WHITE_KEYS.length) * 0.56;
const BLACK_KEYS = ALL_KEYS.filter((m) => BLACK_PITCHES.includes(m % 12)).map((m) => ({
    m,
    left: KEYBED_INSET + ((WHITE_KEYS.indexOf(m - 1) + 1) / WHITE_KEYS.length) * KEYBED_WIDTH - BLACK_WIDTH / 2,
}));

export default function Keyboard({ midi, roots, keyboardMidi = [], onPlayNote, onReleaseNote }) {
    const sounding = new Set(midi);
    const pressed = new Set(keyboardMidi);
    const rootSet = new Set(roots);
    const keyClass = (m, base) => `key ${base}${pressed.has(m) ? " pressed" : rootSet.has(m) ? " root" : sounding.has(m) ? " tone" : ""}`;
    const names = midi.map((m) => NOTE_NAMES[m % 12]).join(", ");

    return (
        <div className="keys" role="img" aria-label={midi.length ? `Нажаты клавиши: ${names}` : "Клавиши не нажаты"}>
            {WHITE_KEYS.map((m) => (
                <button key={m} type="button" className={keyClass(m, "white")}
                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onPlayNote?.(m); }}
                    onPointerUp={() => onReleaseNote?.(m)} onPointerCancel={() => onReleaseNote?.(m)}
                    aria-label={"Нота " + NOTE_NAMES[m % 12]} />
            ))}
            {BLACK_KEYS.map(({ m, left }) => (
                <button key={m} type="button" className={keyClass(m, "black")}
                    style={{ left: left + "%", width: BLACK_WIDTH + "%" }}
                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onPlayNote?.(m); }}
                    onPointerUp={() => onReleaseNote?.(m)} onPointerCancel={() => onReleaseNote?.(m)}
                    aria-label={"Нота " + NOTE_NAMES[m % 12]} />
            ))}
        </div>
    );
}
