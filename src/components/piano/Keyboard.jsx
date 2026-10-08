import { useRef } from "react";
import { NOTE_NAMES } from "../../domain/piano.js";
import { BLACK_PITCHES, KEY_FROM, KEY_TO } from "../../domain/constants.js";
import "../styles/Keyboard.css";

const ALL_KEYS = Array.from({ length: KEY_TO - KEY_FROM + 1 }, (_, i) => KEY_FROM + i);
const WHITE_KEYS = ALL_KEYS.filter((m) => !BLACK_PITCHES.includes(m % 12));
const KEYBED_INSET = 4;
const KEYBED_WIDTH = 100 - KEYBED_INSET * 2;
const BLACK_WIDTH = (KEYBED_WIDTH / WHITE_KEYS.length) * 0.56;
const BLACK_KEYS = ALL_KEYS.filter((m) => BLACK_PITCHES.includes(m % 12)).map((m) => ({
    m,
    left: KEYBED_INSET + ((WHITE_KEYS.indexOf(m - 1) + 1) / WHITE_KEYS.length) * KEYBED_WIDTH - BLACK_WIDTH / 2,
}));

export default function Keyboard({ midi, roots, keyboardMidi = [], previewMidi = [], previewTone = null, onPlayNote, onReleaseNote }) {
    const pointerRef = useRef({ id: null, midi: null });

    const releasePointerNote = () => {
        const active = pointerRef.current;
        if (active.midi != null) onReleaseNote?.(active.midi);
        pointerRef.current = { id: null, midi: null };
    };

    const playPointerNote = (event, nextMidi) => {
        if (pointerRef.current.midi === nextMidi && pointerRef.current.id === event.pointerId) return;

        if (pointerRef.current.midi != null) {
            onReleaseNote?.(pointerRef.current.midi);
        }

        pointerRef.current = { id: event.pointerId, midi: nextMidi };
        onPlayNote?.(nextMidi);
    };

    const sounding = new Set(midi);
    const pressed = new Set(keyboardMidi);
    const rootSet = new Set(roots);
    const previewSet = new Set(previewMidi);
    const keyClass = (m, base) => `key ${base}${pressed.has(m) ? " pressed" : previewSet.has(m) ? ` preview-${previewTone}` : rootSet.has(m) ? " root" : sounding.has(m) ? " tone" : ""}`;
    const names = midi.map((m) => NOTE_NAMES[m % 12]).join(", ");

    return (
        <div className="keys" role="img" aria-label={midi.length ? `Нажаты клавиши: ${names}` : "Клавиши не нажаты"}>
            {WHITE_KEYS.map((m) => (
                <button key={m} type="button" className={keyClass(m, "white")}
                    onPointerDown={(event) => playPointerNote(event, m)}
                    onPointerEnter={(event) => { if (event.buttons & 1) playPointerNote(event, m); }}
                    onPointerUp={(event) => { if (pointerRef.current.id === event.pointerId) releasePointerNote(); }}
                    onPointerLeave={(event) => { if (event.buttons & 1 && pointerRef.current.id === event.pointerId) onReleaseNote?.(m); }}
                    onPointerCancel={(event) => { if (pointerRef.current.id === event.pointerId) releasePointerNote(); }}
                    aria-label={"Нота " + NOTE_NAMES[m % 12]} />
            ))}
            {BLACK_KEYS.map(({ m, left }) => (
                <button key={m} type="button" className={keyClass(m, "black")}
                    style={{ left: left + "%", width: BLACK_WIDTH + "%" }}
                    onPointerDown={(event) => playPointerNote(event, m)}
                    onPointerEnter={(event) => { if (event.buttons & 1) playPointerNote(event, m); }}
                    onPointerUp={(event) => { if (pointerRef.current.id === event.pointerId) releasePointerNote(); }}
                    onPointerLeave={(event) => { if (event.buttons & 1 && pointerRef.current.id === event.pointerId) onReleaseNote?.(m); }}
                    onPointerCancel={(event) => { if (pointerRef.current.id === event.pointerId) releasePointerNote(); }}
                    aria-label={"Нота " + NOTE_NAMES[m % 12]} />
            ))}
        </div>
    );
}
