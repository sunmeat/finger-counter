import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { countFingers } from "./countFingers.js";
import { Player, INSTRUMENTS, planSound, ROOT_MIDI, CHORD_TYPES, NOTE_NAMES } from "./piano.js";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const FINGER_NAMES = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];

// Правша: левая рука — основа аккорда (нота), правая — сам аккорд (мажор, минор…).
// Левша: наоборот.
const HANDEDNESS = [
  { id: "right", name: "Правша" },
  { id: "left", name: "Левша" },
];

// MediaPipe возвращает метку "Left"/"Right" для каждой руки. Эта настройка говорит, как её читать.
// false — метка означает ту руку, что видит пользователь (так и работает у вас на практике).
// Если вдруг левая и правая снова окажутся перепутаны, поставьте true.
const SWAP_HANDS = false;

// Сколько кадров подряд комбинация пальцев должна держаться, чтобы мы её сыграли.
// Защищает от «дребезга» распознавания (~4 кадра ≈ 0.13 с при 30 fps).
const STABLE_FRAMES = 4;

function sideFromLabel(label) {
  if (label !== "Left" && label !== "Right") return null;
  const isRight = (label === "Right") !== SWAP_HANDS;
  return isRight ? "right" : "left";
}

// MediaPipe иногда помечает обе руки одинаково. Тогда решаем по положению на кадре:
// в незеркальном кадре правая рука пользователя находится левее на картинке
// (на экране видео зеркалится, и она оказывается справа).
function fixSides(hands) {
  if (hands.length === 2 && hands[0].side === hands[1].side) {
    const rightIdx = hands[0].wristX < hands[1].wristX ? 0 : 1;
    hands[rightIdx].side = "right";
    hands[1 - rightIdx].side = "left";
  }
}

// Какая физическая рука играет какую роль в зависимости от ведущей руки.
function rolesFor(dominant) {
  const noteSide = dominant === "right" ? "left" : "right";
  const chordSide = noteSide === "left" ? "right" : "left";
  return { noteSide, chordSide };
}

// Рисует скелет одной руки: линии и точки одним цветом (цветом роли руки).
function drawHand(drawing, landmarks, color, ink) {
  drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color, lineWidth: 3 });
  drawing.drawLandmarks(landmarks, { color: ink, fillColor: color, lineWidth: 1.5, radius: 4 });
}

// ---------- Мини-клавиатура: от ля малой октавы (57) до соль второй (79) ----------

const KEY_FROM = 57;
const KEY_TO = 79;
const BLACK_PITCHES = [1, 3, 6, 8, 10];
const ALL_KEYS = Array.from({ length: KEY_TO - KEY_FROM + 1 }, (_, i) => KEY_FROM + i);
const WHITE_KEYS = ALL_KEYS.filter((m) => !BLACK_PITCHES.includes(m % 12));
const BLACK_WIDTH = (100 / WHITE_KEYS.length) * 0.6; // в % от ширины клавиатуры
const BLACK_KEYS = ALL_KEYS.filter((m) => BLACK_PITCHES.includes(m % 12)).map((m) => ({
  m,
  // чёрная клавиша стоит на стыке белой (m − 1) и следующей
  left: ((WHITE_KEYS.indexOf(m - 1) + 1) / WHITE_KEYS.length) * 100 - BLACK_WIDTH / 2,
}));

function Keyboard({ midi, roots }) {
  const sounding = new Set(midi);
  const rootSet = new Set(roots);
  const keyClass = (m, base) =>
      `key ${base}${rootSet.has(m) ? " root" : sounding.has(m) ? " tone" : ""}`;
  const names = midi.map((m) => NOTE_NAMES[m % 12]).join(", ");

  return (
      <div className="keys" role="img" aria-label={midi.length ? `Нажаты клавиши: ${names}` : "Клавиши не нажаты"}>
        {WHITE_KEYS.map((m) => (
            <div key={m} className={keyClass(m, "white")}>
              {m % 12 === 0 && <span className="key-c">до</span>}
            </div>
        ))}
        {BLACK_KEYS.map(({ m, left }) => (
            <div key={m} className={keyClass(m, "black")} style={{ left: `${left}%`, width: `${BLACK_WIDTH}%` }} />
        ))}
      </div>
  );
}

// ---------- Переключатель из нескольких кнопок (инструмент, правша/левша) ----------

function Segmented({ label, options, value, onChange }) {
  return (
      <div className="tool-group" role="group" aria-label={label}>
        {options.map(({ id, name }) => (
            <button
                key={id}
                type="button"
                className={`tool${id === value ? " on" : ""}`}
                aria-pressed={id === value}
                onClick={() => onChange(id)}
            >
              {name}
            </button>
        ))}
      </div>
  );
}

// ---------- Боковая панель руки ----------

// tone: "note" (жёлтая — рука с нотой) или "chord" (синяя — рука с аккордом)
function HandPanel({ side, tone, title, role, seen, rows, note }) {
  return (
      <section className={`panel panel-${side} role-${tone}`} aria-label={title}>
        <header className="panel-head">
          <h2 className="panel-title">{title}</h2>
          <p className="panel-role">{role}</p>
          <span className={`seen${seen ? " on" : ""}`}>{seen ? "в кадре" : "не видно"}</span>
        </header>

        <ul className="rows">
          {rows.map((r) => (
              <li
                  key={r.finger}
                  className={`row${r.plain ? " row-plain" : ""}${r.active ? " on" : ""}`}
                  aria-current={r.active ? "true" : undefined}
              >
                <span className="row-finger">{r.finger}</span>
                <span className="row-value">{r.value}</span>
              </li>
          ))}
        </ul>

        <p className="panel-note">{note}</p>
      </section>
  );
}

// ---------- Экран (только отображение, без логики камеры) ----------

function Screen({
                  videoRef,
                  canvasRef,
                  result,
                  status,
                  soundOn,
                  onEnableSound,
                  instrument,
                  onPickInstrument,
                  dominant,
                  onPickDominant,
                }) {
  const { noteSide, chordSide } = rolesFor(dominant);
  const noteHand = result?.hands.find((h) => h.side === noteSide);
  const chordHand = result?.hands.find((h) => h.side === chordSide);
  const playing = Boolean(result?.midi.length);
  const chordIdx = chordHand ? chordHand.fingers.indexOf(true) : -1;

  const noteRows = FINGER_NAMES.map((finger, i) => ({
    finger,
    value: NOTE_NAMES[ROOT_MIDI[i] % 12],
    active: Boolean(noteHand?.fingers[i]),
  }));

  const chordRows = [
    { finger: "Без пальцев", value: "одна нота", plain: true, active: playing && chordIdx === -1 },
    ...FINGER_NAMES.map((finger, i) => ({
      finger,
      value: CHORD_TYPES[i].name,
      active: chordIdx === i,
    })),
  ];

  // панель на экране слева — про левую руку, справа — про правую (видео зеркальное, как в зеркале)
  const panelFor = (side) => {
    const isNote = side === noteSide;
    const hand = isNote ? noteHand : chordHand;
    return {
      side,
      tone: isNote ? "note" : "chord",
      title: side === "left" ? "Левая рука" : "Правая рука",
      role: isNote ? "Задаёт основную ноту" : "Выбирает аккорд",
      seen: Boolean(hand),
      rows: isNote ? noteRows : chordRows,
      note: isNote
          ? "Можно поднять несколько пальцев: сыграют аккорды от всех выбранных нот."
          : "Если подняты несколько пальцев, работает тот, что выше в списке.",
    };
  };

  const lede = `${noteSide === "left" ? "Левая" : "Правая"} рука задаёт основную ноту, ${
      chordSide === "left" ? "левая" : "правая"
  } выбирает аккорд.`;

  return (
      <main className="app">
        <header className="head">
          <div>
            <h1 className="title">Пианино на пальцах</h1>
            <p className="lede">{lede}</p>
          </div>

          <div className="toolbar">
            <Segmented label="Инструмент" options={INSTRUMENTS} value={instrument} onChange={onPickInstrument} />
            <Segmented label="Ведущая рука" options={HANDEDNESS} value={dominant} onChange={onPickDominant} />

            <button type="button" className="sound-btn" onClick={onEnableSound} disabled={soundOn}>
              {soundOn ? "Звук включён" : "Включить звук"}
            </button>
          </div>
        </header>

        <HandPanel {...panelFor("left")} />

        <div className="center">
          <div className="stage">
            {/* зеркалим и видео, и canvas одинаково */}
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            <p className="chip stage-count">
              Пальцев <strong>{result ? result.count : "–"}</strong>
            </p>
            {!result && <p className="chip stage-note">{status}</p>}
          </div>

          <section className="now" aria-live="polite">
            {result?.chord ? (
                <>
                  <p className="now-chord">{result.chord}</p>
                  <p className="now-notes">Ноты: {result.midi.map((m) => NOTE_NAMES[m % 12]).join(", ")}</p>
                  {!soundOn && <p className="now-hint">Нажмите «Включить звук», чтобы услышать</p>}
                </>
            ) : (
                <p className="now-chord idle">Поднимите палец {noteSide === "left" ? "левой" : "правой"} руки</p>
            )}
          </section>

          <Keyboard midi={result?.midi ?? []} roots={result?.roots ?? []} />
        </div>

        <HandPanel {...panelFor("right")} />
      </main>
  );
}

// ---------- Приложение: камера, распознавание, звук ----------

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  if (!playerRef.current) playerRef.current = new Player();

  const [status, setStatus] = useState("Загрузка модели…");
  const [result, setResult] = useState(null); // { count, hands, chord, midi, roots } | null
  const [soundOn, setSoundOn] = useState(false);
  const [instrument, setInstrument] = useState("piano");
  const [dominant, setDominant] = useState("right"); // ведущая рука: "right" — правша, "left" — левша

  // цикл распознавания живёт один раз, поэтому текущий выбор он читает через ref
  const dominantRef = useRef(dominant);
  useEffect(() => {
    dominantRef.current = dominant;
  }, [dominant]);

  // Клик по кнопке — единственный способ разрешить браузеру воспроизводить звук.
  const enableSound = async () => {
    await playerRef.current.start();
    setSoundOn(true);
  };

  // Выбранный инструмент подхватывается при следующей ноте — цикл распознавания трогать не нужно.
  useEffect(() => {
    playerRef.current.setInstrument(instrument);
  }, [instrument]);

  useEffect(() => {
    const player = playerRef.current;
    let landmarker;
    let stream;
    let rafId;
    let cancelled = false;
    let lastVideoTime = -1;
    let lastUiKey = null;

    // состояние «стабилизатора» звука
    let pendingKey = null;
    let pendingFrames = 0;
    let playingKey = "";

    function updateSound(plan) {
      if (plan.key === pendingKey) pendingFrames++;
      else {
        pendingKey = plan.key;
        pendingFrames = 1;
      }
      if (pendingFrames >= STABLE_FRAMES && plan.key !== playingKey) {
        playingKey = plan.key;
        player.releaseAll();
        player.playNotes(plan.midi); // пустой массив = тишина
      }
    }

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });

        setStatus("Запрашиваю доступ к камере…");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("Покажите руки в камеру");

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const drawing = new DrawingUtils(ctx);

        // цвета скелета берём из CSS, чтобы они всегда совпадали с подсветкой в панелях
        const css = getComputedStyle(document.documentElement);
        const cssVar = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
        const colors = {
          note: cssVar("--note", "#f0b44c"),
          chord: cssVar("--chord", "#62cbd9"),
          neutral: cssVar("--ivory", "#f1ecdf"),
          ink: cssVar("--ink", "#101a23"),
        };

        const loop = () => {
          if (cancelled) return;
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const res = landmarker.detectForVideo(video, performance.now());

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (res.landmarks.length > 0) {
              const handedness = res.handedness ?? res.handednesses ?? [];

              const hands = res.landmarks.map((lm, i) => ({
                ...countFingers(lm),
                side: sideFromLabel(handedness[i]?.[0]?.categoryName),
                wristX: lm[0].x,
              }));
              fixSides(hands);

              // кто задаёт ноту, а кто аккорд — зависит от выбора «правша / левша»
              const dom = dominantRef.current;
              const { noteSide, chordSide } = rolesFor(dom);

              // рука с нотой рисуется жёлтым, рука с аккордом — синим, как в панелях
              hands.forEach((h, i) => {
                const color =
                    h.side === noteSide ? colors.note : h.side === chordSide ? colors.chord : colors.neutral;
                drawHand(drawing, res.landmarks[i], color, colors.ink);
              });

              const noteHand = hands.find((h) => h.side === noteSide);
              const chordHand = hands.find((h) => h.side === chordSide);
              const plan = planSound(noteHand?.fingers, chordHand?.fingers);
              updateSound(plan);

              // обновляем React-состояние только при реальных изменениях
              const uiKey = dom + "|" + hands.map((h) => h.side + h.fingers.map(Number).join("")).join("|");
              if (uiKey !== lastUiKey) {
                lastUiKey = uiKey;
                setResult({
                  count: hands.reduce((s, h) => s + h.count, 0),
                  hands,
                  chord: plan.label,
                  midi: plan.midi,
                  roots: plan.roots,
                });
              }
            } else {
              updateSound({ key: "", midi: [], roots: [], label: "" });
              if (lastUiKey !== null) {
                lastUiKey = null;
                setResult(null);
              }
            }
          }
          rafId = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
        setStatus(`Ошибка: ${e.message || e}`);
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      player.releaseAll();
    };
  }, []);

  return (
      <Screen
          videoRef={videoRef}
          canvasRef={canvasRef}
          result={result}
          status={status}
          soundOn={soundOn}
          onEnableSound={enableSound}
          instrument={instrument}
          onPickInstrument={setInstrument}
          dominant={dominant}
          onPickDominant={setDominant}
      />
  );
}