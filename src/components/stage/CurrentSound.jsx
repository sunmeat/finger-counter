import { NOTE_NAMES } from "../../domain/piano.js";
import "../styles/CurrentSound.css";

export default function CurrentSound({ result, soundOn, noteSide }) {
    return (
        <section className="now" aria-live="polite">
            {result?.chord ? (
                <>
                    <p className="now-chord">{result.chord}</p>
                    <p className="now-notes">Ноти: {result.midi.map((m) => NOTE_NAMES[m % 12]).join(", ")}</p>
                    {!soundOn && <p className="now-hint">Натисніть «Звук вимкнено», щоб почути</p>}
                </>
            ) : (
                <p className="now-chord idle">Підніміть пальці {noteSide === "left" ? "лівий" : "правою"} руки</p>
            )}
        </section>
    );
}
