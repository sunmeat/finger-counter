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
            z: 0.1,
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
    it("counts only the thumb when the other fingers are curled", () => {
        const result = countFingers(makeHand([0]));

        expect(result).toEqual({
            count: 1,
            fingers: [true, false, false, false, false],
        });
    });
    it("counts only the index finger when the others are curled", () => {
        const result = countFingers(makeHand([1]));

        expect(result).toEqual({
            count: 1,
            fingers: [false, true, false, false, false],
        });
    });
    it("counts only the middle finger when the others are curled", () => {
        const result = countFingers(makeHand([2]));

        expect(result).toEqual({
            count: 1,
            fingers: [false, false, true, false, false],
        });
    });
    it("counts only the ring finger when the others are curled", () => {
        const result = countFingers(makeHand([3]));

        expect(result).toEqual({
            count: 1,
            fingers: [false, false, false, true, false],
        });
    });
    it("counts only the pinky when the other fingers are curled", () => {
        const result = countFingers(makeHand([4]));

        expect(result).toEqual({
            count: 1,
            fingers: [false, false, false, false, true],
        });
    });
    it("counts four fingers when the thumb is curled", () => {
        const result = countFingers(makeHand([1, 2, 3, 4]));

        expect(result).toEqual({
            count: 4,
            fingers: [false, true, true, true, true],
        });
    });
    it("counts four fingers when the index finger is curled", () => {
        const result = countFingers(makeHand([0, 2, 3, 4]));

        expect(result).toEqual({
            count: 4,
            fingers: [true, false, true, true, true],
        });
    });
    it("counts the thumb and pinky when the three middle fingers are curled", () => {
        const result = countFingers(makeHand([0, 4]));

        expect(result).toEqual({
            count: 2,
            fingers: [true, false, false, false, true],
        });
    });
    it("counts non-adjacent index and ring fingers", () => {
        const result = countFingers(makeHand([1, 3]));

        expect(result).toEqual({
            count: 2,
            fingers: [false, true, false, true, false],
        });
    });
    it("handles landmarks without z coordinates", () => {
        const hand = makeHand([0, 2, 4]).map(({ x, y }) => ({ x, y }));

        expect(countFingers(hand)).toEqual({
            count: 3,
            fingers: [true, false, true, false, true],
        });
    });
    it("preserves a gesture when all landmarks are translated", () => {
        const hand = makeHand([0, 2, 4]);
        const translated = hand.map(({ x, y, z }) => ({
            x: x + 3,
            y: y - 7,
            z: z + 2,
        }));

        expect(countFingers(translated)).toEqual(countFingers(hand));
    });
    it("preserves a gesture when all landmarks are scaled uniformly", () => {
        const hand = makeHand([0, 1, 3]);
        const scaled = hand.map(({ x, y, z }) => ({
            x: x * 4,
            y: y * 4,
            z: z * 4,
        }));

        expect(countFingers(scaled)).toEqual(countFingers(hand));
    });
    it("counts a mirrored open palm the same way", () => {
        const hand = makeHand([0, 1, 2, 3, 4]);

        expect(countFingers(mirrorHand(hand))).toEqual({
            count: 5,
            fingers: [true, true, true, true, true],
        });
    });
    it("ignores landmarks that are not used for finger angles", () => {
        const hand = makeHand([1, 2]);
        const expected = countFingers(hand);

        [0, 1, 8, 12, 16, 20].forEach((index) => {
            hand[index] = { x: 100 + index, y: -100, z: 50 };
        });

        expect(countFingers(hand)).toEqual(expected);
    });
    it("keeps count equal to the number of extended fingers", () => {
        const result = countFingers(makeHand([0, 2, 4]));

        expect(result.count).toBe(result.fingers.filter(Boolean).length);
        expect(result.count).toBe(3);
    });
    it("treats a zero-length thumb segment as curled", () => {
        const hand = makeHand([0, 1, 2]);
        hand[3] = { ...hand[2] };

        expect(countFingers(hand)).toEqual({
            count: 2,
            fingers: [false, true, true, false, false],
        });
    });
});
