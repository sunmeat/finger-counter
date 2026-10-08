import { CHORD_GESTURES, NOTE_NAMES } from "../piano.js";
import { HANDEDNESS, LEFT_HAND_NOTES } from "../constants.js";
import { rolesFor } from "../handRoles.js";
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
        finger: item.fingers.length ? item.fingers.join(" + ") : "Без пальцев",
        value: item.name,
        plain: type === "chord" && item.mask === 0,
        active: type === "chord" ? chordIsActive(item, mask) : item.mask === mask,
    }));
}

function panelFor(side, noteSide, noteHand, chordHand, noteRows, chordRows) {
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
}

export default function PianoScreen(props) {
    const { result, dominant } = props;
    const { noteSide, chordSide } = rolesFor(dominant);
    const noteHand = result?.hands.find((h) => h.side === noteSide);
    const chordHand = result?.hands.find((h) => h.side === chordSide);
    const noteRows = createRows(LEFT_HAND_NOTES, "note", maskFromFingers(noteHand?.fingers));
    const chordRows = createRows(CHORD_GESTURES, "chord", maskFromFingers(chordHand?.fingers));
    const lede = `${noteSide === "left" ? "Левая" : "Правая"} рука задаёт основную ноту, ${chordSide === "left" ? "левая" : "правая"} выбирает аккорд.`;

    return (
        <main className="app">
            <AppHeader {...props} lede={lede} />
            <HandPanel {...panelFor("left", noteSide, noteHand, chordHand, noteRows, chordRows)} />
            <div className="center">
                <VideoStage {...props} />
                <CurrentSound result={result} soundOn={props.soundOn} noteSide={noteSide} />
                <Keyboard
                    midi={result?.midi ?? []}
                    roots={result?.roots ?? []}
                    keyboardMidi={props.keyboardMidi}
                    onPlayNote={props.onPlayKeyboardNote}
                    onReleaseNote={props.onReleaseKeyboardNote}
                />
            </div>
            <HandPanel {...panelFor("right", noteSide, noteHand, chordHand, noteRows, chordRows)} />
        </main>
    );
}
