export const GESTURE_PROFILES = {
    classic: [],
    chords: [
        { id: "classic-major", side: "right", mask: "10000", type: "chord", target: "major" },
        { id: "classic-minor", side: "right", mask: "11000", type: "chord", target: "minor" },
    ],
};

export const CHORD_TYPES = [
    { id: "major", name: "Мажор", intervals: [0, 4, 7] },
    { id: "minor", name: "Минор", intervals: [0, 3, 7] },
    { id: "major7", name: "Major 7", intervals: [0, 4, 7, 11] },
    { id: "minor7", name: "Minor 7", intervals: [0, 3, 7, 10] },
    { id: "seventh", name: "Доминантсептаккорд", intervals: [0, 4, 7, 10] },
    { id: "sus4", name: "Sus4", intervals: [0, 5, 7] },
    { id: "sus2", name: "Sus2", intervals: [0, 2, 7] },
    { id: "diminished", name: "Уменьшённый", intervals: [0, 3, 6] },
];

export const GESTURE_ACTIONS = [
    { id: "octave-up", name: "Поднять октаву" },
    { id: "octave-down", name: "Опустить октаву" },
    { id: "instrument", name: "Сменить инструмент" },
];

export function validateGestures(gestures) {
    const seen = new Set();
    const conflicts = new Set();
    gestures.forEach((gesture) => {
        const key = gesture.side + ":" + gesture.mask;
        if (seen.has(key)) conflicts.add(key);
        seen.add(key);
    });
    return conflicts;
}

export function normalizeGestures(value) {
    if (!Array.isArray(value)) throw new Error("В JSON ожидается массив gestures.");
    return value.map((item, index) => {
        if (!item || !["left", "right"].includes(item.side) ||
            !/^([01]{5})$/.test(item.mask) ||
            !["note", "chord", ...GESTURE_ACTIONS.map(({ id }) => id)].includes(item.type)) {
            throw new Error(`Некорректный жест №${index + 1}.`);
        }
        if (item.type === "note" && !Number.isInteger(item.target)) {
            throw new Error(`Для жеста №${index + 1} выберите ноту.`);
        }
        if (item.type === "chord" && !CHORD_TYPES.some(({ id }) => id === item.target)) {
            throw new Error(`Для жеста №${index + 1} выберите аккорд.`);
        }
        return { id: String(item.id || crypto.randomUUID()), side: item.side, mask: item.mask, type: item.type, target: item.target ?? "" };
    });
}
