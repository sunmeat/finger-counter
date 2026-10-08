import { describe, expect, it } from "vitest";
import { countFingers } from "./fingerCounter.js";

function makeHand(extended = []) {
    const landmarks = Array.from({ length: 21 }, () => ({
        x: 0,
        y: 0,
        z: 0,
    }));

    const fingers = [
        [2, 3, 4],
        [5, 6, 7],
        [9, 10, 11],
        [13, 14, 15],
        [17, 18, 19],
    ];

    fingers.forEach(([mcp, pip, dip], index) => {
        landmarks[mcp] = { x: 0, y: index * 0.1, z: 0 };
        landmarks[pip] = { x: 1, y: index * 0.1, z: 0 };
        landmarks[dip] = {
            x: extended.includes(index) ? 2 : 0.5,
            y: index * 0.1,
            z: 0.5,
        };
    });

    return landmarks;
}

function mirrorHand(landmarks) {
    return landmarks.map((point) => ({
        ...point,
        x: -point.x,
    }));
}

describe("countFingers", () => {
    it("counts an open palm", () => {
        const result = countFingers(makeHand([0, 1, 2, 3, 4]));

        expect(result).toEqual({
            count: 5,
            fingers: [true, true, true, true, true],
        });
    });

    it("counts a closed fist", () => {
        const result = countFingers(makeHand());

        expect(result).toEqual({
            count: 0,
            fingers: [false, false, false, false, false],
        });
    });

    it("counts the index and middle fingers for a victory gesture", () => {
        const result = countFingers(makeHand([1, 2]));

        expect(result).toEqual({
            count: 2,
            fingers: [false, true, true, false, false],
        });
    });

    it("counts the same gesture for a mirrored left hand", () => {
        const rightHand = makeHand([0, 1, 2]);
        const leftHand = mirrorHand(rightHand);

        expect(countFingers(rightHand)).toEqual(countFingers(leftHand));
    });
});
