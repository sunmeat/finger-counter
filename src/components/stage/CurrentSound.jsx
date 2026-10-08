import { NOTE_NAMES } from "../../domain/piano.js";
import "./styles/CurrentSound.css";

export default function CurrentSound({ result, soundOn, noteSide }) {
    return (
        <section className="now" aria-live="polite">
            {result?.chord ? (
                <>
                    <p className="now-chord">{result.chord}</p>
                    <p className="now-notes">Ноты: {result.midi.map((m) => NOTE_NAMES[m % 12]).join(", ")}</p>
                    {!soundOn && <p className="now-hint">Нажмите «Звук выключен», чтобы услышать</p>}
                </>
            ) : (
                <p className="now-chord idle">Поднимите пальцы {noteSide === "left" ? "левой" : "правой"} руки</p>
            )}
        </section>
    );
}
