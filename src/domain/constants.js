export const WASM_URL = "/mediapipe/wasm";
export const MODEL_URL = "/mediapipe/hand_landmarker.task";

export const FINGER_NAMES = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];

export const HANDEDNESS = [
    { id: "right", name: "Правша" },
    { id: "left", name: "Левша" },
];

export const SWAP_HANDS = false;
export const STABLE_FRAMES = 4;

export const KEY_FROM = 57;
export const KEY_TO = 87;
export const BLACK_PITCHES = [1, 3, 6, 8, 10];

export const LEFT_HAND_NOTES = [
    { fingers: [1], mask: "10000", name: "до" },
    { fingers: [1, 2], mask: "11000", name: "ре" },
    { fingers: [1, 2, 3], mask: "11100", name: "ми" },
    { fingers: [1, 2, 3, 4], mask: "11110", name: "фа" },
    { fingers: [1, 2, 3, 4, 5], mask: "11111", name: "соль" },
    { fingers: [2], mask: "01000", name: "ля" },
    { fingers: [2, 3], mask: "01100", name: "си" },
    { fingers: [2, 3, 4], mask: "01110", name: "до" },
    { fingers: [1, 5], mask: "10001", name: "до♯" },
    { fingers: [1, 2, 5], mask: "11001", name: "ре♯" },
    { fingers: [1, 2, 3, 5], mask: "11101", name: "фа♯" },
    { fingers: [2, 3, 4, 5], mask: "01111", name: "соль♯" },
    { fingers: [2, 5], mask: "01001", name: "ля♯" },
];
