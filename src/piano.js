// src/piano.js — ноты, аккорды и синтезатор инструментов
// (рояль, гитара) на Web Audio API, без библиотек.
//
// Какая рука задаёт ноту, а какая аккорд, решает App.jsx
// (зависит от переключателя «Правша / Левша»):
//  - правша: левая рука — основная нота, правая — тип аккорда;
//  - левша: наоборот.
//
// Здесь рука не важна:
// planSound() получает пальцы «руки с нотой»
// и «руки с аккордом».

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

/*
 * Нумерация пальцев:
 *
 * 1 = большой
 * 2 = указательный
 * 3 = средний
 * 4 = безымянный
 * 5 = мизинец
 *
 * Порядок массива fingers:
 *
 * [большой, указательный, средний, безымянный, мизинец]
 *
 * mask:
 *
 * 10000 = только 1
 * 11000 = 1 + 2
 * 11100 = 1 + 2 + 3
 * и т. д.
 *
 * ВАЖНО:
 * каждая комбинация является точным соответствием одной ноте.
 *
 * Если комбинации нет в таблице,
 * ничего не играется.
 *
 * MIDI:
 * C4 = 60
 * D4 = 62
 * E4 = 64
 * F4 = 65
 * G4 = 67
 * A4 = 69
 * B4 = 71
 * C5 = 72
 */
export const NOTE_COMBINATIONS = [
    // Натуральные ноты

    {
        mask: "10000",
        fingers: [1],
        name: "до",
        midi: 60,
    },

    {
        mask: "11000",
        fingers: [1, 2],
        name: "ре",
        midi: 62,
    },

    {
        mask: "11100",
        fingers: [1, 2, 3],
        name: "ми",
        midi: 64,
    },

    {
        mask: "11110",
        fingers: [1, 2, 3, 4],
        name: "фа",
        midi: 65,
    },

    {
        mask: "11111",
        fingers: [1, 2, 3, 4, 5],
        name: "соль",
        midi: 67,
    },

    {
        mask: "01000",
        fingers: [2],
        name: "ля",
        midi: 69,
    },

    {
        mask: "01100",
        fingers: [2, 3],
        name: "си",
        midi: 71,
    },

    {
        mask: "01110",
        fingers: [2, 3, 4],
        name: "до",
        midi: 72,
    },

    // Диезы

    {
        mask: "10001",
        fingers: [1, 5],
        name: "до♯",
        midi: 61,
    },

    {
        mask: "11001",
        fingers: [1, 2, 5],
        name: "ре♯",
        midi: 63,
    },

    {
        mask: "11101",
        fingers: [1, 2, 3, 5],
        name: "фа♯",
        midi: 66,
    },

    {
        mask: "01111",
        fingers: [2, 3, 4, 5],
        name: "соль♯",
        midi: 68,
    },

    {
        mask: "01001",
        fingers: [2, 5],
        name: "ля♯",
        midi: 70,
    },
];

/*
 * Алиас оставляем для интерфейса и возможного
 * использования в других файлах проекта.
 *
 * Теперь это не пять нот по пяти пальцам,
 * а полноценная таблица комбинаций.
 */
export const LEFT_HAND_NOTES = NOTE_COMBINATIONS;

/*
 * Оставляем ROOT_MIDI для совместимости
 * со старым кодом.
 *
 * В новом App.jsx этот массив уже не используется,
 * потому что одна нота определяется комбинацией пальцев,
 * а не отдельным пальцем.
 */
export const ROOT_MIDI = NOTE_COMBINATIONS.map(
    ({ midi }) => midi
);

const NOTE_MAP = new Map(
    NOTE_COMBINATIONS.map(
        (note) => [note.mask, note]
    )
);

// ---------- Аккорды ----------

/*
 * Рука с аккордом.
 *
 * Теперь аккорд определяется НЕ первым поднятым пальцем,
 * а точной комбинацией пальцев.
 *
 * 1             = мажор
 * 1 + 2         = минор
 * 1 + 2 + 3     = Major 7
 * 1 + 2 + 3 + 4 = Minor 7
 * и т. д.
 *
 * fingers:
 *   номера поднятых пальцев.
 *
 * mask:
 *   двоичное представление комбинации.
 *
 * intervals:
 *   интервалы в полутонах относительно основной ноты.
 */
export const CHORD_GESTURES = [
    {
        fingers: [],
        mask: 0,
        name: "одна нота",
        intervals: [0],
    },

    {
        fingers: [1],
        mask: 1,
        name: "мажор",
        intervals: [0, 4, 7],
    },

    {
        fingers: [1, 2],
        mask: 3,
        name: "минор",
        intervals: [0, 3, 7],
    },

    {
        fingers: [1, 2, 3],
        mask: 7,
        name: "Major 7",
        intervals: [0, 4, 7, 11],
    },

    {
        fingers: [1, 2, 3, 4],
        mask: 15,
        name: "Minor 7",
        intervals: [0, 3, 7, 10],
    },

    {
        fingers: [1, 2, 5],
        mask: 19,
        name: "7",
        intervals: [0, 4, 7, 10],
    },

    {
        fingers: [1, 5],
        mask: 17,
        name: "sus4",
        intervals: [0, 5, 7],
    },

    {
        fingers: [2, 5],
        mask: 18,
        name: "sus2",
        intervals: [0, 2, 7],
    },

    {
        fingers: [1, 3],
        mask: 5,
        name: "diminished",
        intervals: [0, 3, 6],
    },

    {
        fingers: [1, 2, 4],
        mask: 11,
        name: "augmented",
        intervals: [0, 4, 8],
    },

    {
        fingers: [2, 3],
        mask: 6,
        name: "6",
        intervals: [0, 4, 7, 9],
    },

    {
        fingers: [2, 4],
        mask: 10,
        name: "m6",
        intervals: [0, 3, 7, 9],
    },

    {
        fingers: [1, 3, 5],
        mask: 21,
        name: "m7",
        intervals: [0, 3, 7, 10],
    },

    {
        fingers: [1, 3, 4],
        mask: 13,
        name: "7sus4",
        intervals: [0, 5, 7, 10],
    },

    {
        fingers: [2, 3, 5],
        mask: 22,
        name: "m7♭5",
        intervals: [0, 3, 6, 10],
    },

    {
        fingers: [1, 2, 3, 5],
        mask: 23,
        name: "9",
        intervals: [0, 4, 7, 10, 14],
    },

    {
        fingers: [1, 2, 4, 5],
        mask: 27,
        name: "m9",
        intervals: [0, 3, 7, 10, 14],
    },

    {
        fingers: [1, 3, 4, 5],
        mask: 29,
        name: "7♯9",
        intervals: [0, 4, 7, 10, 15],
    },

    {
        fingers: [2, 3, 4, 5],
        mask: 30,
        name: "6/9",
        intervals: [0, 4, 7, 9, 14],
    },

    {
        fingers: [1, 2, 3, 4, 5],
        mask: 31,
        name: "13",
        intervals: [0, 4, 7, 10, 14, 21],
    },
];

const CHORD_MAP = new Map(
    CHORD_GESTURES.map(
        (chord) => [chord.mask, chord]
    )
);

// ---------- Вспомогательные функции ----------

function fingersToMask(fingers) {
    return (fingers ?? [])
        .map(Boolean)
        .map(Number)
        .join("");
}

function fingersToChordMask(fingers) {
    return (fingers ?? []).reduce(
        (mask, isUp, index) =>
            mask |
            (isUp
                ? 1 << index
                : 0),
        0
    );
}

export function getNoteByFingers(fingers) {
    const mask = fingersToMask(fingers);

    return NOTE_MAP.get(mask) ?? null;
}

export function chordFromFingers(fingers) {
    const mask =
        fingersToChordMask(
            fingers
        );

    return (
        CHORD_MAP.get(mask) ??
        null
    );
}

/*
 * По поднятым пальцам обеих рук решает, что играть.
 *
 * noteFingers:
 *   пальцы руки, которая задаёт основную ноту.
 *
 * chordFingers:
 *   пальцы руки, которая выбирает аккорд.
 *
 * Правила:
 *
 * 1. Комбинация руки с нотой должна точно присутствовать
 *    в NOTE_COMBINATIONS.
 *
 * 2. Если комбинации нет, играется тишина.
 *
 * 3. Если комбинация существует,
 *    она соответствует ровно одной основной ноте.
 *
 * 4. На руке с аккордом используется точная комбинация
 *    из CHORD_GESTURES.
 *
 * 5. Если на руке с аккордом нет поднятых пальцев,
 *    играется только основная нота.
 *
 * Возвращает:
 *
 * {
 *   key,
 *   midi,
 *   roots,
 *   label
 * }
 */
export function planSound(
    noteFingers,
    chordFingers
) {
    const note =
        getNoteByFingers(
            noteFingers
        );

    /*
     * Нет допустимой комбинации:
     * ничего не играем.
     */
    if (!note) {
        return {
            key: "",
            midi: [],
            roots: [],
            label: "",
        };
    }

    /*
     * Получаем точную комбинацию
     * пальцев руки с аккордом.
     */
    const chord =
        chordFromFingers(
            chordFingers
        );

    /*
     * Если комбинация неизвестна,
     * ничего не играем.
     *
     * Это важно: теперь случайная комбинация
     * пальцев не превращается автоматически
     * в какой-либо аккорд.
     */
    if (!chord) {
        return {
            key: "",
            midi: [],
            roots: [],
            label: "",
        };
    }

    /*
     * Строим MIDI-ноты.
     */
    const midi = [
        ...new Set(
            chord.intervals.map(
                (interval) =>
                    note.midi +
                    interval
            )
        ),
    ].sort(
        (a, b) => a - b
    );

    return {
        key: midi.join(","),
        midi,
        roots: [note.midi],
        label:
            `${note.name} ${chord.name}`.trim(),
    };
}

// ---------- Инструменты ----------

export const INSTRUMENTS = [
    {
        id: "piano",
        name: "Рояль",
    },

    {
        id: "guitar",
        name: "Гитара",
    },
];

// Рояль: обертоны [номер гармоники, громкость].
const PARTIALS = [
    [1, 1],
    [2, 0.45],
    [3, 0.22],
    [4, 0.12],
    [5, 0.06],
];

const GUITAR_OCTAVE_SHIFT = -12;
const GUITAR_STRUM_DELAY = 0.03;
const GUITAR_NOTE_SECONDS = 3.5;

export class Player {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.voices = [];
        this.instrument = "piano";
        this.pluckCache = new Map();
    }

    /*
     * Вызывается из обработчика клика.
     *
     * Браузеры не разрешают воспроизводить звук
     * без пользовательского действия.
     */
    async start() {
        if (!this.ctx) {
            const AC =
                window.AudioContext ||
                window.webkitAudioContext;

            this.ctx = new AC();

            this.master =
                this.ctx.createGain();

            this.master.gain.value = 0.35;

            const limiter =
                this.ctx.createDynamicsCompressor();

            this.master
                .connect(limiter)
                .connect(
                    this.ctx.destination
                );
        }

        await this.ctx.resume();
    }

    get ready() {
        return (
            this.ctx?.state === "running"
        );
    }

    setInstrument(id) {
        if (id === this.instrument) {
            return;
        }

        this.releaseAll();

        this.instrument = id;
    }

    /*
     * Играет все ноты выбранным инструментом.
     */
    playNotes(midiNotes) {
        if (
            !this.ready ||
            midiNotes.length === 0
        ) {
            return;
        }

        const t =
            this.ctx.currentTime;

        /*
         * Чтобы аккорд из нескольких нот
         * не был в несколько раз громче
         * одиночной ноты.
         */
        const level =
            1 /
            Math.sqrt(
                midiNotes.length
            );

        if (
            this.instrument === "guitar"
        ) {
            /*
             * Небольшая задержка между струнами
             * создаёт эффект боя.
             */
            midiNotes.forEach(
                (m, i) => {
                    this.voices.push(
                        this.#pluck(
                            m +
                            GUITAR_OCTAVE_SHIFT,
                            t +
                            i *
                            GUITAR_STRUM_DELAY,
                            level
                        )
                    );
                }
            );
        } else {
            for (
                const m of midiNotes
                ) {
                this.voices.push(
                    this.#pianoVoice(
                        m,
                        t,
                        level
                    )
                );
            }
        }
    }

    /*
     * Быстро приглушает всё,
     * что сейчас звучит.
     */
    releaseAll() {
        if (!this.ready) {
            return;
        }

        const now =
            this.ctx.currentTime;

        for (
            const v of this.voices
            ) {
            v.gain.gain.cancelScheduledValues(
                now
            );

            v.gain.gain.setTargetAtTime(
                0,
                now,
                0.05
            );
        }

        this.voices = [];
    }

    // ---------- Рояль ----------

    #pianoVoice(
        midi,
        t,
        level
    ) {
        const ctx = this.ctx;

        const freq =
            440 *
            2 **
            ((midi - 69) /
                12);

        const voiceGain =
            ctx.createGain();

        voiceGain.connect(
            this.master
        );

        for (
            const [n, amp]
            of PARTIALS
            ) {
            const osc =
                ctx.createOscillator();

            osc.type = "sine";

            osc.frequency.value =
                freq * n;

            const gain =
                ctx.createGain();

            gain.gain.setValueAtTime(
                0,
                t
            );

            gain.gain.linearRampToValueAtTime(
                amp * level,
                t + 0.005
            );

            gain.gain.setTargetAtTime(
                0,
                t + 0.005,
                1.2 / n
            );

            osc
                .connect(gain)
                .connect(voiceGain);

            osc.start(t);

            osc.stop(
                t + 7
            );
        }

        return {
            gain: voiceGain,
        };
    }

    // ---------- Гитара ----------

    #pluck(
        midi,
        t,
        level
    ) {
        const ctx = this.ctx;

        const src =
            ctx.createBufferSource();

        src.buffer =
            this.#pluckBuffer(
                midi
            );

        const voiceGain =
            ctx.createGain();

        voiceGain.gain.value =
            level * 0.9;

        src
            .connect(voiceGain)
            .connect(this.master);

        src.start(t);

        return {
            gain: voiceGain,
        };
    }

    #pluckBuffer(midi) {
        const cached =
            this.pluckCache.get(
                midi
            );

        if (cached) {
            return cached;
        }

        const sr =
            this.ctx.sampleRate;

        const freq =
            440 *
            2 **
            ((midi - 69) /
                12);

        const period =
            Math.round(
                sr / freq
            );

        const length =
            Math.floor(
                sr *
                GUITAR_NOTE_SECONDS
            );

        const buffer =
            this.ctx.createBuffer(
                1,
                length,
                sr
            );

        const data =
            buffer.getChannelData(
                0
            );

        let prev = 0;

        /*
         * Щипок струны.
         */
        for (
            let i = 0;
            i <= period;
            i++
        ) {
            prev =
                0.6 * prev +
                0.4 *
                (Math.random() *
                    2 -
                    1);

            data[i] = prev;
        }

        /*
         * Алгоритм Карплюса–Стронга.
         */
        const decay = 0.997;

        for (
            let i = period + 1;
            i < length;
            i++
        ) {
            data[i] =
                decay *
                0.5 *
                (data[
                    i - period
                        ] +
                    data[
                    i -
                    period -
                    1
                        ]);
        }

        /*
         * Нормализация громкости.
         */
        let peak = 0;

        for (
            let i = 0;
            i < length;
            i++
        ) {
            peak =
                Math.max(
                    peak,
                    Math.abs(
                        data[i]
                    )
                );
        }

        if (peak > 0) {
            for (
                let i = 0;
                i < length;
                i++
            ) {
                data[i] /=
                    peak;
            }
        }

        this.pluckCache.set(
            midi,
            buffer
        );

        return buffer;
    }
}