import * as Tone from "tone";

// ---------- Инструменты ----------



const PIANO_BASE_URL = "https://tonejs.github.io/audio/salamander/";

function midiToNote(midi) {
    return Tone.Frequency(midi, "midi").toNote();
}

function polySynth(voice, options, volume = -8) {
    const synth = new Tone.PolySynth(voice, {
        maxPolyphony: 12,
        ...options,
    });
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
    const synth = polySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 2.6,
        oscillator: { type: "sine" },
        envelope: { attack: 0.025, decay: 0.18, sustain: 0.88, release: 0.45 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.16, sustain: 0.55, release: 0.3 },
    }, -15);

    const filter = new Tone.Filter(4800, "lowpass", -12);
    const chorus = new Tone.Chorus(1.8, 2.8, 0.32).start();
    const tremolo = new Tone.Tremolo(5.3, 0.16).start();

    synth.disconnect();
    synth.chain(filter, chorus, tremolo, Tone.getDestination());
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
        this.keyboardNotes = new Set();
        this.started = false;
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
        this.releaseKeyboardNotes();

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

    playKeyboardNote(midi) {
        if (!this.ready) {
            return;
        }

        if (!this.synth) {
            this.synth = this.#ensureInstrument(this.instrument);
        }

        if (this.keyboardNotes.has(midi)) {
            return;
        }

        this.keyboardNotes.add(midi);
        this.synth.triggerAttack(midiToNote(midi), undefined, 0.7);
    }

    releaseKeyboardNote(midi) {
        if (!this.ready || !this.synth || !this.keyboardNotes.has(midi)) {
            return;
        }

        this.keyboardNotes.delete(midi);
        this.synth.triggerRelease(midiToNote(midi), undefined);
    }

    releaseKeyboardNotes() {
        if (!this.synth || !this.ready || !this.keyboardNotes.size) {
            this.keyboardNotes.clear();
            return;
        }

        this.synth.triggerRelease(
            [...this.keyboardNotes].map(midiToNote),
            undefined
        );
        this.keyboardNotes.clear();
    }

    releaseAll() {
        if (!this.synth || !this.ready || !this.activeNotes.length) {
            return;
        }

        this.synth.triggerRelease(this.activeNotes, undefined);
        this.activeNotes = [];
    }
}
