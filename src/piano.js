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

// ---------- Инструменты ----------

export const INSTRUMENTS = [
    { id: "piano", name: "Acoustic Piano" },
    { id: "electric", name: "Electric Piano" },
    { id: "wavetable", name: "Wavetable Synth" },
    { id: "strings", name: "String Ensemble" },
    { id: "celesta", name: "Celesta" },
    { id: "marimba", name: "Marimba" },
    { id: "nylon", name: "Nylon Pluck" },
    { id: "accordion", name: "Accordion" },
    { id: "vibraphone", name: "Vibraphone" },
    { id: "soft-pad", name: "Soft Pad" },
    { id: "analog-lead", name: "Analog Lead" },
    { id: "retro-synth", name: "Retro Synth" },
    { id: "brass", name: "Synth Brass" },
    { id: "flute", name: "Flute" },
    { id: "choir", name: "Choir Pad" },
    { id: "digital-piano", name: "Digital Piano" },
    { id: "clavinet", name: "Clavinet" },
    { id: "deep-bass", name: "Deep Bass" },
    { id: "dream-pad", name: "Dream Pad" },
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


function createWavetable() {
    const filter = new Tone.Filter(2800, "lowpass", -12);
    const synth = polySynth(Tone.Synth, {
        oscillator: { type: "custom", partials: [1, 0.62, 0.32, 0.18, 0.08, 0.035] },
        envelope: { attack: 0.015, decay: 0.3, sustain: 0.78, release: 1.3 },
    }, -12);
    synth.disconnect();
    synth.connect(filter);
    filter.toDestination();
    return synth;
}

function createAcousticPiano() {
    return new Tone.Sampler({
        urls: {
            C1: "C1.mp3", A1: "A1.mp3", C2: "C2.mp3", A2: "A2.mp3",
            C3: "C3.mp3", A3: "A3.mp3", C4: "C4.mp3", A4: "A4.mp3",
            C5: "C5.mp3", A5: "A5.mp3", C6: "C6.mp3", A6: "A6.mp3", C7: "C7.mp3",
        },
        baseUrl: PIANO_BASE_URL,
        release: 2.2,
        volume: -6,
    }).toDestination();
}

function createElectric() {
    const synth = polySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.72, release: 1.15 },
    }, -9);
    const tremolo = new Tone.Tremolo(5.2, 0.18).start();
    const chorus = new Tone.Chorus(2.2, 2.5, 0.25).start();
    synth.disconnect();
    synth.chain(tremolo, chorus, Tone.getDestination());
    return synth;
}

function createStringEnsemble() {
    const synth = polySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 16 },
        envelope: { attack: 0.32, decay: 0.4, sustain: 0.78, release: 1.8 },
    }, -15);
    const filter = new Tone.Filter(3200, "lowpass", -12);
    synth.disconnect();
    synth.chain(filter, Tone.getDestination());
    return synth;
}

function createCelesta() {
    const synth = polySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 7,
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.7, sustain: 0.05, release: 1.1 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.1, release: 0.5 },
    }, -10);
    return synth;
}

function createMarimba() {
    const synth = polySynth(Tone.MembraneSynth, {
        pitchDecay: 0.03,
        octaves: 2.2,
        envelope: { attack: 0.001, decay: 1.1, sustain: 0.05, release: 0.8 },
    }, -12);
    return synth;
}

function createNylonPluck() {
    const synth = polySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.003, decay: 0.65, sustain: 0.08, release: 0.9 },
    }, -12);
    const filter = new Tone.Filter(3200, "lowpass", -12);
    synth.disconnect();
    synth.chain(filter, Tone.getDestination());
    return synth;
}

function createAccordion() {
    const synth = polySynth(Tone.Synth, {
        oscillator: { type: "custom", partials: [1, 0.72, 0.52, 0.3, 0.18, 0.09] },
        envelope: { attack: 0.04, decay: 0.18, sustain: 0.9, release: 0.35 },
    }, -14);
    const filter = new Tone.Filter(3600, "lowpass", -12);
    const tremolo = new Tone.Tremolo(4.7, 0.12).start();
    synth.disconnect();
    synth.chain(filter, tremolo, Tone.getDestination());
    return synth;
}

function createVibraphone() {
    const synth = polySynth(Tone.FMSynth, {
        harmonicity: 2.01,
        modulationIndex: 2.8,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 1.4, sustain: 0.25, release: 2.2 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.12, release: 1.2 },
    }, -13);
    const tremolo = new Tone.Tremolo(5, 0.2).start();
    synth.disconnect();
    synth.chain(tremolo, Tone.getDestination());
    return synth;
}

function createSoftPad() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "fatsine", count: 3, spread: 18 },
        envelope: { attack: 0.7, decay: 0.5, sustain: 0.82, release: 2.8 },
    }, -16);
}

function createAnalogLead() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.68, release: 0.45 },
    }, -15);
}

function createRetroSynth() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.008, decay: 0.22, sustain: 0.58, release: 0.35 },
    }, -17);
}

function createBrass() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 12 },
        envelope: { attack: 0.12, decay: 0.22, sustain: 0.72, release: 0.65 },
    }, -16);
}

function createFlute() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.08, decay: 0.2, sustain: 0.82, release: 0.7 },
    }, -13);
}

function createChoir() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "fatsine", count: 3, spread: 9 },
        envelope: { attack: 0.28, decay: 0.25, sustain: 0.88, release: 1.7 },
    }, -17);
}

function createDigitalPiano() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "custom", partials: [1, 0.45, 0.18, 0.08, 0.025] },
        envelope: { attack: 0.004, decay: 0.5, sustain: 0.38, release: 1.1 },
    }, -11);
}

function createClavinet() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.002, decay: 0.18, sustain: 0.12, release: 0.22 },
    }, -16);
}

function createDeepBass() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.025, decay: 0.3, sustain: 0.72, release: 0.8 },
    }, -13);
}

function createDreamPad() {
    return polySynth(Tone.Synth, {
        oscillator: { type: "fatsine", count: 5, spread: 28 },
        envelope: { attack: 1.1, decay: 0.8, sustain: 0.9, release: 3.8 },
    }, -19);
}

function createInstrument(id) {
    switch (id) {
        case "wavetable":
            return createWavetable();
        case "piano":
            return createAcousticPiano();
        case "electric":
            return createElectric();
        case "strings":
            return createStringEnsemble();
        case "celesta":
            return createCelesta();
        case "marimba":
            return createMarimba();
        case "nylon":
            return createNylonPluck();
        case "accordion":
            return createAccordion();
        case "vibraphone":
            return createVibraphone();
        case "soft-pad":
            return createSoftPad();
        case "analog-lead":
            return createAnalogLead();
        case "retro-synth":
            return createRetroSynth();
        case "brass":
            return createBrass();
        case "flute":
            return createFlute();
        case "choir":
            return createChoir();
        case "digital-piano":
            return createDigitalPiano();
        case "clavinet":
            return createClavinet();
        case "deep-bass":
            return createDeepBass();
        case "dream-pad":
            return createDreamPad();
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

    playKeyboardNote(midi, duration = 0.45) {
        if (!this.ready) {
            return;
        }

        if (!this.synth) {
            this.synth = this.#ensureInstrument(this.instrument);
        }

        const note = midiToNote(midi);
        const velocity = 0.7;
        this.synth.triggerAttackRelease(note, duration, undefined, velocity);
    }

    releaseAll() {
        if (!this.synth || !this.ready || !this.activeNotes.length) {
            return;
        }

        this.synth.triggerRelease(this.activeNotes, undefined);
        this.activeNotes = [];
    }
}
