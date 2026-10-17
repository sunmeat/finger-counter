import { describe, expect, it } from "vitest";
import { getNoteByFingers } from "./piano.js";

describe("getNoteByFingers", () => {
    it("returns null for an unsupported finger combination", () => {
        expect(getNoteByFingers([false, false, false, false, false])).toBeNull();
    });
});
