// src/piano.js — ноты, аккорды и синтезатор инструментов (рояль, гитара) на Web Audio API, без библиотек.
//
// Какая рука задаёт ноту, а какая аккорд, решает App.jsx (зависит от переключателя «Правша / Левша»):
//  - правша: левая рука — основная нота, правая — тип аккорда;
//  - левша: наоборот.
// Здесь рука не важна: planSound() получает пальцы «руки с нотой» и «руки с аккордом».

// ---------- Что играет какой палец ----------

// Нота задаётся MIDI-номером: 60 = до первой октавы (C4), 69 = ля (A4).
// Рука с нотой: [большой, указательный, средний, безымянный, мизинец]
export const ROOT_MIDI = [
    60, // большой     — до
    57, // указательный — ля (малая октава, чтобы не скакать вверх)
    64, // средний     — ми
    65, // безымянный  — фа
    67, // мизинец     — соль
];

// Рука с аккордом. Интервалы — в полутонах от основной ноты.
export const CHORD_TYPES = [
    { name: "мажор", intervals: [0, 4, 7] }, // большой
    { name: "минор", intervals: [0, 3, 7] }, // указательный
    { name: "Major 7", intervals: [0, 4, 7, 11] }, // безымянный
    { name: "Minor 7", intervals: [0, 3, 7, 10] }, // мизинец
    { name: "септаккорд (7)", intervals: [0, 4, 7, 10] }, // средний
];
const SINGLE_NOTE = { name: "", intervals: [0] }; // на руке с аккордом нет поднятых пальцев

export const NOTE_NAMES = ["до", "до♯", "ре", "ре♯", "ми", "фа", "фа♯", "соль", "соль♯", "ля", "ля♯", "си"];

/**
 * По поднятым пальцам обеих рук решает, что играть.
 * noteFingers  — пальцы руки, которая задаёт основные ноты,
 * chordFingers — пальцы руки, которая выбирает тип аккорда.
 * Оба — массивы boolean из countFingers() или undefined, если руки нет в кадре.
 * Правила:
 *  - руки с нотой нет или на ней нет поднятых пальцев → тишина;
 *  - каждый поднятый палец руки с нотой даёт свою основную ноту;
 *  - если на руке с аккордом поднято несколько пальцев, берётся первый по порядку (большой → мизинец);
 *  - на руке с аккордом нет поднятых пальцев (или её нет в кадре) → играет одна нота без аккорда.
 * Возвращает { key, midi, roots, label }:
 *  - midi — все звучащие ноты, roots — только основные (их выбрала рука с нотой);
 *  - key одинаков, пока звучание то же самое — по нему мы понимаем, что пора играть заново.
 */
export function planSound(noteFingers, chordFingers) {
    const roots = (noteFingers ?? []).flatMap((up, i) => (up ? [ROOT_MIDI[i]] : []));
    if (roots.length === 0) return { key: "", midi: [], roots: [], label: "" };

    const chordIdx = (chordFingers ?? []).indexOf(true);
    const type = chordIdx === -1 ? SINGLE_NOTE : CHORD_TYPES[chordIdx];

    const midi = [...new Set(roots.flatMap((r) => type.intervals.map((iv) => r + iv)))].sort((a, b) => a - b);
    const rootNames = roots.map((m) => NOTE_NAMES[m % 12]).join(" + ");
    return { key: midi.join(","), midi, roots, label: `${rootNames} ${type.name}`.trim() };
}

// ---------- Инструменты ----------

export const INSTRUMENTS = [
    { id: "piano", name: "Рояль" },
    { id: "guitar", name: "Гитара" },
];

// Рояль: обертоны [номер гармоники, громкость]. Верхние затухают быстрее — звук «щипка».
const PARTIALS = [
    [1, 1],
    [2, 0.45],
    [3, 0.22],
    [4, 0.12],
    [5, 0.06],
];

const GUITAR_OCTAVE_SHIFT = -12; // гитара звучит на октаву ниже, чем рояль
const GUITAR_STRUM_DELAY = 0.03; // пауза между струнами при «бое», секунды
const GUITAR_NOTE_SECONDS = 3.5; // длина буфера со звуком одной струны

export class Player {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.voices = [];
        this.instrument = "piano";
        this.pluckCache = new Map(); // midi → AudioBuffer с готовой струной
    }

    /** Вызывать из обработчика клика: браузеры не дают играть звук без действия пользователя. */
    async start() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.35;
            const limiter = this.ctx.createDynamicsCompressor(); // чтобы аккорды не клиппили
            this.master.connect(limiter).connect(this.ctx.destination);
        }
        await this.ctx.resume();
    }

    get ready() {
        return this.ctx?.state === "running";
    }

    setInstrument(id) {
        if (id === this.instrument) return;
        this.releaseAll();
        this.instrument = id;
    }

    /** Играет все ноты (midiNotes — отсортированный массив MIDI-номеров) выбранным инструментом. */
    playNotes(midiNotes) {
        if (!this.ready || midiNotes.length === 0) return;
        const t = this.ctx.currentTime;
        // чтобы аккорд из 4 нот не был в 4 раза громче одиночной
        const level = 1 / Math.sqrt(midiNotes.length);

        if (this.instrument === "guitar") {
            // «бой»: струны берутся снизу вверх с небольшой задержкой
            midiNotes.forEach((m, i) => {
                this.voices.push(this.#pluck(m + GUITAR_OCTAVE_SHIFT, t + i * GUITAR_STRUM_DELAY, level));
            });
        } else {
            for (const m of midiNotes) this.voices.push(this.#pianoVoice(m, t, level));
        }
    }

    /** Быстро приглушает всё, что сейчас звучит (и ещё не начавшиеся ноты «боя»). */
    releaseAll() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        for (const v of this.voices) {
            v.gain.gain.cancelScheduledValues(now);
            v.gain.gain.setTargetAtTime(0, now, 0.05);
        }
        this.voices = [];
    }

    // --- рояль: сумма синусоид с быстрой атакой и затуханием ---
    #pianoVoice(midi, t, level) {
        const ctx = this.ctx;
        const freq = 440 * 2 ** ((midi - 69) / 12);

        const voiceGain = ctx.createGain(); // общий регулятор ноты — им делаем release
        voiceGain.connect(this.master);

        for (const [n, amp] of PARTIALS) {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq * n;

            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(amp * level, t + 0.005); // атака — удар молоточка
            g.gain.setTargetAtTime(0, t + 0.005, 1.2 / n); // естественное затухание

            osc.connect(g).connect(voiceGain);
            osc.start(t);
            osc.stop(t + 7);
        }
        return { gain: voiceGain };
    }

    // --- гитара: щипковая струна по алгоритму Карплюса — Стронга ---
    #pluck(midi, t, level) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.#pluckBuffer(midi);

        const voiceGain = ctx.createGain();
        voiceGain.gain.value = level * 0.9;
        src.connect(voiceGain).connect(this.master);
        src.start(t);
        return { gain: voiceGain };
    }

    #pluckBuffer(midi) {
        const cached = this.pluckCache.get(midi);
        if (cached) return cached;

        const sr = this.ctx.sampleRate;
        const freq = 440 * 2 ** ((midi - 69) / 12);
        const period = Math.round(sr / freq); // длина «струны» в сэмплах
        const length = Math.floor(sr * GUITAR_NOTE_SECONDS);
        const buffer = this.ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);

        // щипок: шум, слегка сглаженный, чтобы звук был теплее
        let prev = 0;
        for (let i = 0; i <= period; i++) {
            prev = 0.6 * prev + 0.4 * (Math.random() * 2 - 1);
            data[i] = prev;
        }
        // струна: каждый проход усредняет два соседних значения — верха уходят быстрее низов
        const decay = 0.997;
        for (let i = period + 1; i < length; i++) {
            data[i] = decay * 0.5 * (data[i - period] + data[i - period - 1]);
        }

        // нормализуем громкость, чтобы все струны звучали примерно одинаково
        let peak = 0;
        for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
        if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;

        this.pluckCache.set(midi, buffer);
        return buffer;
    }
}