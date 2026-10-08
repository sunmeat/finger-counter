export function sideFromLabel(label, swapHands = false) {
    if (label !== "Left" && label !== "Right") {
        return null;
    }

    const isRight = (label === "Right") !== swapHands;
    return isRight ? "right" : "left";
}

export function fixSides(hands) {
    if (hands.length === 2 && hands[0].side === hands[1].side) {
        const rightIdx = hands[0].wristX < hands[1].wristX ? 0 : 1;
        hands[rightIdx].side = "right";
        hands[1 - rightIdx].side = "left";
    }
}

export function rolesFor(dominant) {
    const noteSide = dominant === "right" ? "left" : "right";
    const chordSide = noteSide === "left" ? "right" : "left";

    return { noteSide, chordSide };
}
