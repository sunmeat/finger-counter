// src/piano.js — ноты, аккорды и синтезатор «пианино» на Web Audio API (без библиотек).

// ---------- Что играет какой палец ----------

// Нота задаётся MIDI-номером: 60 = до первой октавы (C4), 69 = ля (A4).
// Правая рука: [большой, указательный, средний, безымянный, мизинец]
export const ROOT_MIDI = [
    60, // большой     — до
    57, // указательный — ля (малая октава, чтобы не скакать вверх)
    64, // средний     — ми
    65, // безымянный  — фа
    67, // мизинец     — соль
];

// Левая рука: какой палец какой аккорд включает. Интервалы — в полутонах от основной ноты.
export const CHORD_TYPES = [
    { name: "мажор", intervals: [0, 4, 7] }, // большой
    { name: "минор", intervals: [0, 3, 7] }, // указательный
    { name: "Major 7", intervals: [0, 4, 7, 11] }, // безымянный
    { name: "Minor 7", intervals: [0, 3, 7, 10] }, // мизинец
    { name: "септаккорд (7)", intervals: [0, 4, 7, 10] }, // средний
];
const SINGLE_NOTE = { name: "", intervals: [0] }; // на левой руке нет поднятых пальцев

export const NOTE_NAMES = ["до", "до♯", "ре", "ре♯", "ми", "фа", "фа♯", "соль", "соль♯", "ля", "ля♯", "си"];

/**
 * По поднятым пальцам обеих рук решает, что играть.
 * rightFingers / leftFingers — массивы boolean из countFingers() или undefined, если руки нет в кадре.
 * Правила:
 *  - правой руки нет или на ней нет поднятых пальцев → тишина;
 *  - каждый поднятый палец правой руки даёт свою основную ноту;
 *  - если на левой поднято несколько пальцев, берётся первый по порядку (большой → мизинец).
 * Возвращает { key, midi, roots, label }:
 *  - midi — все звучащие ноты, roots — только основные (их выбрала правая рука);
 *  - key одинаков, пока звучание то же самое — по нему мы понимаем, что пора играть заново.
 */
export function planSound(rightFingers, leftFingers) {
    const roots = (rightFingers ?? []).flatMap((up, i) => (up ? [ROOT_MIDI[i]] : []));
    if (roots.length === 0) return { key: "", midi: [], roots: [], label: "" };

    const leftIdx = (leftFingers ?? []).indexOf(true);
    const type = leftIdx === -1 ? SINGLE_NOTE : CHORD_TYPES[leftIdx];

    const midi = [...new Set(roots.flatMap((r) => type.intervals.map((iv) => r + iv)))].sort((a, b) => a - b);
    const rootNames = roots.map((m) => NOTE_NAMES[m % 12]).join(" + ");
    return { key: midi.join(","), midi, roots, label: `${rootNames} ${type.name}`.trim() };
}

// ---------- Синтезатор ----------

// Обертоны: [номер гармоники, громкость]. Верхние затухают быстрее — звук «щипка», как у пианино.
const PARTIALS = [
    [1, 1],
    [2, 0.45],
    [3, 0.22],
    [4, 0.12],
    [5, 0.06],
];

export class Piano {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.voices = [];
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

    /** Играет все ноты одновременно (midiNotes — массив MIDI-номеров). */
    playNotes(midiNotes) {
        if (!this.ready || midiNotes.length === 0) return;
        const t = this.ctx.currentTime;
        // чтобы аккорд из 4 нот не был в 4 раза громче одиночной
        const level = 1 / Math.sqrt(midiNotes.length);
        for (const m of midiNotes) this.voices.push(this.#voice(m, t, level));
    }

    /** Быстро приглушает всё, что сейчас звучит. */
    releaseAll() {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        for (const v of this.voices) {
            v.gain.gain.cancelScheduledValues(now);
            v.gain.gain.setTargetAtTime(0, now, 0.05);
        }
        this.voices = [];
    }

    #voice(midi, t, level) {
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
}