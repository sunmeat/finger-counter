import { describe, expect, it } from "vitest";
import { completeGestureLayout } from "./customGestures.js";

describe("completeGestureLayout", () => {
    it("creates 64 gesture combinations for both hands", () => {
        expect(completeGestureLayout()).toHaveLength(64);
    });
});
