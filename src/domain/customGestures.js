export const GESTURE_PROFILES = {
    classic: [],
    chords: [
        { id: "classic-major", side: "right", mask: "10000", type: "chord", target: "major" },
        { id: "classic-minor", side: "right", mask: "11000", type: "chord", target: "minor" },
    ],
};

export const CHORD_TYPES = [
    { id: "major", name: "Мажор", intervals: [0, 4, 7] },
    { id: "minor", name: "Мінор", intervals: [0, 3, 7] },
    { id: "major7", name: "Мажорний септакорд", intervals: [0, 4, 7, 11] },
    { id: "minor7", name: "Мінорний септакорд", intervals: [0, 3, 7, 10] },
    { id: "seventh", name: "Домінантсептакорд", intervals: [0, 4, 7, 10] },
    { id: "sus4", name: "Sus4", intervals: [0, 5, 7] },
    { id: "sus2", name: "Sus2", intervals: [0, 2, 7] },
    { id: "diminished", name: "Зменшений", intervals: [0, 3, 6] },
];

export const GESTURE_ACTIONS = [
    { id: "octave-up", name: "Підняти октаву" },
    { id: "octave-down", name: "Опустити октаву" },
    { id: "instrument", name: "Змінити інструмент" },
];

export const ALL_MASKS = Array.from({ length: 32 }, (_, value) => value.toString(2).padStart(5, "0"));

export function completeGestureLayout(gestures = []) {
    const existing = new Map((Array.isArray(gestures) ? gestures : []).map((item) => [item.side + ":" + item.mask, item]));
    return ["left", "right"].flatMap((side) => ALL_MASKS.map((mask) => {
        const saved = existing.get(side + ":" + mask);
        return saved
            ? { id: String(saved.id || side + "-" + mask), side, mask, type: saved.type || "default", target: saved.target ?? "" }
            : { id: side + "-" + mask, side, mask, type: "default", target: "" };
    }));
}

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
    if (!Array.isArray(value)) throw new Error("У JSON очікується масив gestures.");
    if (value.length !== 64) throw new Error("Неповна розкладка: JSON повинен містити рівно 64 комбінації, по 32 для кожної руки.");
    const normalized = value.map((item, index) => {
        if (!item || !["left", "right"].includes(item.side) ||
            !/^([01]{5})$/.test(item.mask) ||
            !["default", "note", "chord", ...GESTURE_ACTIONS.map(({ id }) => id)].includes(item.type)) {
            throw new Error("Некоректний жест №" + (index + 1) + ".");
        }
        if (item.type === "note" && (!Number.isInteger(item.target) || item.target < 48 || item.target > 84)) {
            throw new Error("Для жесту №" + (index + 1) + " Виберіть ноту в діапазоні MIDI 48–84.");
        }
        if (item.type === "chord" && !CHORD_TYPES.some(({ id }) => id === item.target)) {
            throw new Error("Для жесту №" + (index + 1) + " Виберіть акорд.");
        }
        if (item.type === "instrument" && typeof item.target !== "string") {
            throw new Error("Для жесту №" + (index + 1) + " виберіть інструмент.");
        }
        return { id: String(item.id || item.side + "-" + item.mask), side: item.side, mask: item.mask, type: item.type, target: item.target ?? "" };
    });
    const keys = new Set(normalized.map((item) => item.side + ":" + item.mask));
    if (keys.size !== 64) throw new Error("У JSON є повторювані комбінації руки та пальців.");
    for (const side of ["left", "right"]) {
        for (const mask of ALL_MASKS) {
            if (!keys.has(side + ":" + mask)) throw new Error("У JSON відсутня комбінація " + side + " / " + mask + ".");
        }
    }
    return normalized;
}
