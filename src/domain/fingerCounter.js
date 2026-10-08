// Индексы точек руки в MediaPipe Hands (21 landmark)
// 0 — запястье; у каждого пальца: MCP -> PIP -> DIP -> TIP
const WRIST = 0;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const PINKY_MCP = 17;
const FINGERS = [
  { name: "index", pip: 6, tip: 8 },
  { name: "middle", pip: 10, tip: 12 },
  { name: "ring", pip: 14, tip: 16 },
  { name: "pinky", pip: 18, tip: 20 },
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

/**
 * Считает разогнутые пальцы по 21 точке руки.
 * Не зависит от поворота руки и от того, левая она или правая:
 *  - обычные пальцы разогнуты, если кончик дальше от запястья, чем средний сустав (PIP);
 *  - большой палец разогнут, если его кончик дальше от основания мизинца, чем его IP-сустав.
 *
 * @returns {{ count: number, fingers: boolean[] }} fingers: [thumb, index, middle, ring, pinky]
 */
export function countFingers(landmarks) {
  const thumb =
    dist(landmarks[THUMB_TIP], landmarks[PINKY_MCP]) >
    dist(landmarks[THUMB_IP], landmarks[PINKY_MCP]);

  const others = FINGERS.map(
    ({ pip, tip }) => dist(landmarks[tip], landmarks[WRIST]) > dist(landmarks[pip], landmarks[WRIST])
  );

  const fingers = [thumb, ...others];
  return { count: fingers.filter(Boolean).length, fingers };
}
