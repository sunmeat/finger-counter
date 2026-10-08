// src/piano.js
// Ноты, аккорды и набор инструментов на Tone.js.
//
// Tone.js берёт на себя полифонию, ADSR, фильтры,
// сэмплирование и синтез. Логика жестов при этом
// остаётся полностью независимой от аудиодвижка.

import * as Tone from "tone";

// ---------- Ноты ----------

export const NOTE_NAMES = [
    "до",
    "до♯",
    "ре",
    "ре♯",
    "ми",
    "фа",
    "фа♯",
    "соль",
    "соль♯",
    "ля",
    "ля♯",
    "си",
];

export const NOTE_COMBINATIONS = [
    { mask: "10000", fingers: [1], name: "до", midi: 60 },
    { mask: "11000", fingers: [1, 2], name: "ре", midi: 62 },
    { mask: "11100", fingers: [1, 2, 3], name: "ми", midi: 64 },
    { mask: "11110", fingers: [1, 2, 3, 4], name: "фа", midi: 65 },
    { mask: "11111", fingers: [1, 2, 3, 4, 5], name: "соль", midi: 67 },
    { mask: "01000", fingers: [2], name: "ля", midi: 69 },
    { mask: "01100", fingers: [2, 3], name: "си", midi: 71 },
    { mask: "01110", fingers: [2, 3, 4], name: "до", midi: 72 },
    { mask: "10001", fingers: [1, 5], name: "до♯", midi: 61 },
    { mask: "11001", fingers: [1, 2, 5], name: "ре♯", midi: 63 },
    { mask: "11101", fingers: [1, 2, 3, 5], name: "фа♯", midi: 66 },
    { mask: "01111", fingers: [2, 3, 4, 5], name: "соль♯", midi: 68 },
    { mask: "01001", fingers: [2, 5], name: "ля♯", midi: 70 },
];

export const LEFT_HAND_NOTES = NOTE_COMBINATIONS;
export const ROOT_MIDI = NOTE_COMBINATIONS.map(({ midi }) => midi);

const NOTE_MAP = new Map(
    NOTE_COMBINATIONS.map((note) => [note.mask, note])
);

// ---------- Аккорды ----------

export const CHORD_GESTURES = [
    { fingers: [], mask: 0, name: "одна нота", intervals: [0] },
    { fingers: [1], mask: 1, name: "мажор", intervals: [0, 4, 7] },
    { fingers: [1, 2], mask: 3, name: "минор", intervals: [0, 3, 7] },
    { fingers: [1, 2, 3], mask: 7, name: "Major 7", intervals: [0, 4, 7, 11] },
    { fingers: [1, 2, 3, 4], mask: 15, name: "Minor 7", intervals: [0, 3, 7, 10] },
    { fingers: [1, 2, 5], mask: 19, name: "7", intervals: [0, 4, 7, 10] },
    { fingers: [1, 5], mask: 17, name: "sus4", intervals: [0, 5, 7] },
    { fingers: [2, 5], mask: 18, name: "sus2", intervals: [0, 2, 7] },
    { fingers: [1, 3], mask: 5, name: "diminished", intervals: [0, 3, 6] },
    { fingers: [1, 2, 4], mask: 11, name: "augmented", intervals: [0, 4, 8] },
    { fingers: [2, 3], mask: 6, name: "6", intervals: [0, 4, 7, 9] },
    { fingers: [2, 4], mask: 10, name: "m6", intervals: [0, 3, 7, 9] },
    { fingers: [1, 3, 5], mask: 21, name: "m7", intervals: [0, 3, 7, 10] },
    { fingers: [1, 3, 4], mask: 13, name: "7sus4", intervals: [0, 5, 7, 10] },
    { fingers: [2, 3, 5], mask: 22, name: "m7♭5", intervals: [0, 3, 6, 10] },
    { fingers: [1, 2, 3, 5], mask: 23, name: "9", intervals: [0, 4, 7, 10, 14] },
    { fingers: [1, 2, 4, 5], mask: 27, name: "m9", intervals: [0, 3, 7, 10, 14] },
    { fingers: [1, 3, 4, 5], mask: 29, name: "7♯9", intervals: [0, 4, 7, 10, 15] },
    { fingers: [2, 3, 4, 5], mask: 30, name: "6/9", intervals: [0, 4, 7, 9, 14] },
    { fingers: [1, 2, 3, 4, 5], mask: 31, name: "13", intervals: [0, 4, 7, 10, 14, 21] },
];

const CHORD_MAP = new Map(
    CHORD_GESTURES.map((chord) => [chord.mask, chord])
);

function fingersToMask(fingers) {
    return (fingers ?? []).map(Boolean).map(Number).join("");
}

function fingersToChordMask(fingers) {
    return (fingers ?? []).reduce(
        (mask, isUp, index) => mask | (isUp ? 1 << index : 0),
        0
    );
}

export function getNoteByFingers(fingers) {
    return NOTE_MAP.get(fingersToMask(fingers)) ?? null;
}

export function chordFromFingers(fingers) {
    return CHORD_MAP.get(fingersToChordMask(fingers)) ?? null;
}

export function planSound(noteFingers, chordFingers) {
    const note = getNoteByFingers(noteFingers);

    if (!note) {
        return { key: "", midi: [], roots: [], label: "" };
    }

    const chord = chordFromFingers(chordFingers);

    if (!chord) {
        return { key: "", midi: [], roots: [], label: "" };
    }

    const midi = [...new Set(
        chord.intervals.map((interval) => note.midi + interval)
    )].sort((a, b) => a - b);

    return {
        key: midi.join(","),
        midi,
        roots: [note.midi],
        label: `${note.name} ${chord.name}`.trim(),
    };
}
