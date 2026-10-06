import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { countFingers } from "./countFingers.js";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const FINGER_NAMES = ["Большой", "Указательный", "Средний", "Безымянный", "Мизинец"];

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Загрузка модели…");
  const [result, setResult] = useState(null); // { count, hands } | null

  useEffect(() => {
    let landmarker;
    let stream;
    let rafId;
    let cancelled = false;
    let lastVideoTime = -1;
    let lastCount = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2, // ← теперь две руки
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
        setStatus("Покажите руку(и) в камеру");

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const drawing = new DrawingUtils(ctx);

        const loop = () => {
          if (cancelled) return;
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const res = landmarker.detectForVideo(video, performance.now());

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (res.landmarks.length > 0) {
              let totalCount = 0;
              const hands = [];

              res.landmarks.forEach((lm) => {
                // рисуем скелет каждой руки
                drawing.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, {
                  color: "#00e676",
                  lineWidth: 3,
                });
                drawing.drawLandmarks(lm, { color: "#ff1744", radius: 3 });

                const r = countFingers(lm);
                totalCount += r.count;
                hands.push(r);
              });

              if (totalCount !== lastCount) {
                lastCount = totalCount;
                setResult({ count: totalCount, hands });
              }
            } else if (lastCount !== null) {
              lastCount = null;
              setResult(null);
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
    };
  }, []);

  return (
      <main className="app">
        <h1>Сколько пальцев?</h1>

        <div className="stage">
          {/* зеркалим и видео, и canvas одинаково */}
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} />
        </div>

        <div className="count">{result ? result.count : "–"}</div>

        {result ? (
            <>
              <p className="status">
                Всего: <strong>{result.count}</strong>
                {result.hands.length === 2 ? " (две руки)" : " (одна рука)"}
              </p>

              {/* Детализация по каждой руке */}
              <div className="hands-detail">
                {result.hands.map((hand, idx) => (
                    <div key={idx} className="hand-block">
                      <h3>Рука {idx + 1}: {hand.count}</h3>
                      <ul className="fingers">
                        {FINGER_NAMES.map((name, i) => (
                            <li key={name} className={hand.fingers[i] ? "up" : ""}>
                              {name}
                            </li>
                        ))}
                      </ul>
                    </div>
                ))}
              </div>
            </>
        ) : (
            <p className="status">{status}</p>
        )}
      </main>
  );
}