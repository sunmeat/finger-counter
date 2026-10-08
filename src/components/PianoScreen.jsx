import { useEffect, useState } from "react";
import { CHORD_GESTURES, getNoteByFingers, NOTE_COMBINATIONS } from "../domain/piano.js";
import { rolesFor } from "../domain/handRoles.js";
import AppHeader from "./layout/AppHeader.jsx";
import HandPanel from "./hand/HandPanel.jsx";
import VideoStage from "./stage/VideoStage.jsx";
import CurrentSound from "./stage/CurrentSound.jsx";
import Keyboard from "./piano/Keyboard.jsx";

function maskFromFingers(fingers) {
    return fingers?.map(Boolean).map(Number).join("") ?? "";
}

function chordIsActive(chord, mask) {
    if (chord.mask === 0) return mask === "";
    return chord.fingers.every((finger) => mask[finger - 1] === "1") &&
        mask.split("").filter((value) => value === "1").length === chord.fingers.length;
}

function createRows(items, type, mask) {
    return items.map((item) => ({
        key: type + "-" + item.mask,
        finger: item.fingers.length ? item.fingers.join(" + ") : "Без пальцев",
        value: item.name,
        plain: type === "chord" && item.mask === 0,
        active: type === "chord" ? chordIsActive(item, mask) : item.mask === mask,
        midi: type === "note" ? [item.midi] : item.intervals,
    }));
}

function panelFor(side, noteSide, noteHand, chordHand, noteRows, chordRows, onRowClick) {
    const isNote = side === noteSide;
    return {
        side,
        tone: isNote ? "note" : "chord",
        title: side === "left" ? "Левая рука" : "Правая рука",
        role: isNote ? "Задаёт основную ноту" : "Выбирает аккорд",
        seen: Boolean(isNote ? noteHand : chordHand),
        rows: isNote ? noteRows : chordRows,
        onRowClick,
        note: isNote
            ? "Каждая комбинация пальцев соответствует одной ноте."
            : "Каждая комбинация пальцев соответствует отдельному аккорду.",
    };
}

export default function PianoScreen(props) {
    const { result, dominant, onPlayPreview } = props;
    const [preview, setPreview] = useState({ midi: [], tone: null });

    useEffect(() => {
        if (!preview.midi.length) return;

        const timer = window.setTimeout(() => {
            setPreview({ midi: [], tone: null });
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [preview]);
    const { noteSide, chordSide } = rolesFor(dominant);
    const noteHand = result?.hands.find((h) => h.side === noteSide);
    const chordHand = result?.hands.find((h) => h.side === chordSide);
    const noteMask = maskFromFingers(noteHand?.fingers);
    const chordMask = maskFromFingers(chordHand?.fingers);
    const noteRows = createRows(NOTE_COMBINATIONS, "note", noteMask);
    const chordRows = createRows(CHORD_GESTURES, "chord", chordMask);
    const currentRoot = getNoteByFingers(noteHand?.fingers)?.midi ?? 60;

    const handleRowClick = (row) => {
        const midi = row.midi.map((value) =>
            row.key.startsWith("chord-") ? currentRoot + value : value
        );
        setPreview({ midi, tone: row.key.startsWith("chord-") ? "chord" : "note" });
        onPlayPreview?.(midi);
    };

    const lede = `${noteSide === "left" ? "Левая" : "Правая"} рука задаёт основную ноту, ${chordSide === "left" ? "левая" : "правая"} выбирает аккорд.`;

    return (
        <main className="app">
            <AppHeader {...props} lede={lede} />
            <HandPanel {...panelFor("left", noteSide, noteHand, chordHand, noteRows, chordRows, handleRowClick)} />
            <div className="center">
                <VideoStage {...props} />
                <CurrentSound result={result} soundOn={props.soundOn} noteSide={noteSide} />
                <Keyboard
                    midi={result?.midi ?? []}
                    roots={result?.roots ?? []}
                    keyboardMidi={props.keyboardMidi}
                    previewMidi={preview.midi}
                    previewTone={preview.tone}
                    onPlayNote={props.onPlayKeyboardNote}
                    onReleaseNote={props.onReleaseKeyboardNote}
                />
            </div>
            <HandPanel {...panelFor("right", noteSide, noteHand, chordHand, noteRows, chordRows, handleRowClick)} />
        </main>
    );
}