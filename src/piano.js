// src/piano.js
// Ноты, аккорды и пять инструментов на Tone.js.
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

// ---------- Инструменты ----------

export const INSTRUMENTS = [
    { id: "subtractive", name: "Субтрактивный полифонический синтезатор" },
    { id: "wavetable", name: "Wavetable Synth" },
    { id: "piano", name: "Acoustic Piano" },
    { id: "electric", name: "Electric Piano / Organ" },
];

const PIANO_BASE_URL = "https://tonejs.github.io/audio/salamander/";

function midiToNote(midi) {
    return Tone.Frequency(midi, "midi").toNote();
}

function polySynth(voice, options, volume = -8) {
    const synth = new Tone.PolySynth(voice, options);
    synth.volume.value = volume;
    synth.toDestination();
    return synth;
}

function createSubtractive() {
    const filter = new Tone.Filter(1800, "lowpass", -12);
    const synth = polySynth(Tone.Synth, {
        oscillator: {
            type: "sawtooth",
        },
        envelope: {
            attack: 0.015,
            decay: 0.18,
            sustain: 0.48,
            release: 0.55,
        },
    }, -10);

    synth.disconnect();
    synth.connect(filter);
    filter.toDestination();

    return synth;
}

function createWavetable() {
    const filter = new Tone.Filter(2600, "lowpass", -12);
    const synth = polySynth(Tone.Synth, {
        oscillator: {
            type: "custom",
            partials: [1, 0.62, 0.32, 0.18, 0.08, 0.035],
        },
        envelope: {
            attack: 0.01,
            decay: 0.22,
            sustain: 0.62,
            release: 0.7,
        },
    }, -12);

    synth.disconnect();
    synth.connect(filter);
    filter.toDestination();

    return synth;
}

function createAcousticPiano() {
    return new Tone.Sampler({
        urls: {
            C1: "C1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
        },
        baseUrl: PIANO_BASE_URL,
        release: 1.6,
        volume: -6,
    }).toDestination();
}

function createElectric() {
    const synth = polySynth(Tone.Synth, {
        oscillator: {
            type: "sine",
        },
        envelope: {
            attack: 0.015,
            decay: 0.25,
            sustain: 0.55,
            release: 0.8,
        },
    }, -9);

    const tremolo = new Tone.Tremolo(5.2, 0.18).start();
    const chorus = new Tone.Chorus(2.2, 2.5, 0.25).start();

    synth.disconnect();
    synth.chain(tremolo, chorus, Tone.getDestination());

    return synth;
}

function createInstrument(id) {
    switch (id) {
        case "subtractive":
            return createSubtractive();
        case "wavetable":
            return createWavetable();
        case "piano":
            return createAcousticPiano();
        case "electric":
            return createElectric();
        default:
            return createAcousticPiano();
    }
}

export class Player {
    constructor() {
        this.instrument = "piano";
        this.synth = null;
        this.synths = new Map();
        this.activeNotes = [];
        this.started = false;
        this.pianoLoaded = null;
    }

    async start() {
        await Tone.start();
        this.started = true;

        this.#ensureInstrument(this.instrument);

        if (this.instrument === "piano") {
            await Tone.loaded();
        }
    }

    get ready() {
        return this.started && Tone.getContext().state === "running";
    }

    setInstrument(id) {
        if (id === this.instrument && this.synth) {
            return;
        }

        this.releaseAll();

        this.instrument = id;
        this.synth = this.started ? this.#ensureInstrument(id) : null;
    }

    #ensureInstrument(id) {
        let synth = this.synths.get(id);

        if (!synth) {
            synth = createInstrument(id);
            this.synths.set(id, synth);
        }

        return synth;
    }

    playNotes(midiNotes) {
        if (!this.ready || !midiNotes.length) {
            return;
        }

        if (!this.synth) {
            this.synth = this.#ensureInstrument(this.instrument);
        }

        const notes = midiNotes.map(midiToNote);
        const velocity = Math.min(0.82, 0.95 / Math.sqrt(notes.length));
        this.synth.triggerAttack(notes, undefined, velocity);
        this.activeNotes = notes;
    }

    releaseAll() {
        if (!this.synth || !this.ready || !this.activeNotes.length) {
            return;
        }

        this.synth.triggerRelease(this.activeNotes, undefined);
        this.activeNotes = [];
    }
}
