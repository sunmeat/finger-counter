import { CHORD_GESTURES, INSTRUMENTS, NOTE_NAMES } from "../piano.js";
import { HANDEDNESS, LEFT_HAND_NOTES } from "../constants.js";
import { rolesFor } from "../handRoles.js";
import Keyboard from "./Keyboard.jsx";
import Segmented from "./Segmented.jsx";
import HandPanel from "./HandPanel.jsx";

function maskFromFingers(fingers) {
    return fingers?.map(Boolean).map(Number).join("") ?? "";
}

function chordIsActive(chord, mask) {
    if (chord.mask === 0) return mask === "";
    return chord.fingers.every((finger) => mask[finger - 1] === "1") &&
        mask.split("").filter((value) => value === "1").length === chord.fingers.length;
}

export default function PianoScreen({
    videoRef,
    canvasRef,
    result,
    status,
    soundOn,
    onEnableSound,
    instrument,
    onPickInstrument,
    dominant,
    onPickDominant,
    onPlayKeyboardNote,
}) {
    const { noteSide, chordSide } = rolesFor(dominant);
    const noteHand = result?.hands.find((h) => h.side === noteSide);
    const chordHand = result?.hands.find((h) => h.side === chordSide);

    const noteMask = maskFromFingers(noteHand?.fingers);
    const chordMask = maskFromFingers(chordHand?.fingers);

    const noteRows = LEFT_HAND_NOTES.map((note) => ({
        finger: note.fingers.join(" + "),
        value: note.name,
        active: note.mask === noteMask,
    }));

    const chordRows = CHORD_GESTURES.map((chord) => ({
        finger: chord.fingers.length ? chord.fingers.join(" + ") : "Без пальцев",
        value: chord.name,
        plain: chord.mask === 0,
        active: chordIsActive(chord, chordMask),
    }));

    const panelFor = (side) => {
        const isNote = side === noteSide;
        return {
            side,
            tone: isNote ? "note" : "chord",
            title: side === "left" ? "Левая рука" : "Правая рука",
            role: isNote ? "Задаёт основную ноту" : "Выбирает аккорд",
            seen: Boolean(isNote ? noteHand : chordHand),
            rows: isNote ? noteRows : chordRows,
            note: isNote
                ? "Каждая комбинация пальцев соответствует одной ноте."
                : "Каждая комбинация пальцев соответствует отдельному аккорду.",
        };
    };

    const lede = `${noteSide === "left" ? "Левая" : "Правая"} рука задаёт основную ноту, ${chordSide === "left" ? "левая" : "правая"} выбирает аккорд.`;

    return (
        <main className="app">
            <header className="head">
                <div>
                    <h1 className="title">Пианино на пальцах</h1>
                    <p className="lede">{lede}</p>
                </div>

                <div className="toolbar">
                    <Segmented
                        label="Инструмент"
                        options={INSTRUMENTS}
                        value={instrument}
                        onChange={onPickInstrument}
                    />

                    <Segmented
                        label="Ведущая рука"
                        options={HANDEDNESS}
                        value={dominant}
                        onChange={onPickDominant}
                    />

                    <button
                        type="button"
                        className="sound-btn"
                        onClick={onEnableSound}
                        disabled={soundOn}
                    >
                        {soundOn ? "Звук включён" : "Включить звук"}
                    </button>
                </div>
            </header>

            <HandPanel {...panelFor("left")} />

            <div className="center">
                <div className="stage">
                    <video ref={videoRef} playsInline muted />
                    <canvas ref={canvasRef} />

                    <p className="chip stage-count">
                        Пальцев <strong>{result ? result.count : "–"}</strong>
                    </p>

                    {!result && <p className="chip stage-note">{status}</p>}
                </div>

                <section className="now" aria-live="polite">
                    {result?.chord ? (
                        <>
                            <p className="now-chord">{result.chord}</p>
                            <p className="now-notes">
                                Ноты: {result.midi.map((m) => NOTE_NAMES[m % 12]).join(", ")}
                            </p>

                            {!soundOn && (
                                <p className="now-hint">
                                    Нажмите «Включить звук», чтобы услышать
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="now-chord idle">
                            Поднимите пальцы {noteSide === "left" ? "левой" : "правой"} руки
                        </p>
                    )}
                </section>

                <Keyboard
                    midi={result?.midi ?? []}
                    roots={result?.roots ?? []}
                    onPlayNote={onPlayKeyboardNote}
                />
            </div>

            <HandPanel {...panelFor("right")} />
        </main>
    );
}
