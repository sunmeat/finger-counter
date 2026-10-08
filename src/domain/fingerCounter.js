// Индексы точек руки в MediaPipe Hands (21 landmark)
// 0 — запястье; у каждого пальца: MCP -> PIP -> DIP -> TIP
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;

const FINGERS = [
    { name: "index", mcp: 5, pip: 6, dip: 7 },
    { name: "middle", mcp: 9, pip: 10, dip: 11 },
    { name: "ring", mcp: 13, pip: 14, dip: 15 },
    { name: "pinky", mcp: 17, pip: 18, dip: 19 },
];

const EXTENDED_ANGLE = 155;
const THUMB_EXTENDED_ANGLE = 155;

function angle(a, b, c) {
    const ab = {
        x: a.x - b.x,
        y: a.y - b.y,
        z: (a.z ?? 0) - (b.z ?? 0),
    };

    const cb = {
        x: c.x - b.x,
        y: c.y - b.y,
        z: (c.z ?? 0) - (b.z ?? 0),
    };

    const abLength = Math.hypot(ab.x, ab.y, ab.z);
    const cbLength = Math.hypot(cb.x, cb.y, cb.z);

    if (!abLength || !cbLength) return 0;

    const cosine =
        (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) /
        (abLength * cbLength);

    return Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI);
}

function isExtended(a, b, c, threshold) {
    return angle(a, b, c) >= threshold;
}

/**
 * Считает разогнутые пальцы по 3D world landmarks MediaPipe.
 *
 * Для указательного, среднего, безымянного и мизинца используется угол
 * MCP-PIP-DIP. Разогнутый палец имеет большой угол в PIP, а согнутый
 * уменьшается независимо от расстояния руки до камеры и её проекции.
 *
 * Для большого пальца используется угол MCP-IP-TIP, поскольку у него
 * другая структура суставов.
 *
 * @returns {{ count: number, fingers: boolean[] }} fingers: [thumb, index, middle, ring, pinky]
 */
export function countFingers(worldLandmarks) {
    const thumb = isExtended(
        worldLandmarks[THUMB_MCP],
        worldLandmarks[THUMB_IP],
        worldLandmarks[THUMB_TIP],
        THUMB_EXTENDED_ANGLE
    );

    const others = FINGERS.map(({ mcp, pip, dip }) =>
        isExtended(
            worldLandmarks[mcp],
            worldLandmarks[pip],
            worldLandmarks[dip],
            EXTENDED_ANGLE
        )
    );

    const fingers = [thumb, ...others];
    return { count: fingers.filter(Boolean).length, fingers };
}
