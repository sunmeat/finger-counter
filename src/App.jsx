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
  const [result, setResult] = useState(null); // { count, fingers } | null

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
          numHands: 1,
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
        setStatus("Покажите руку в камеру");

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
              const lm = res.landmarks[0];
              drawing.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, {
                color: "#00e676",
                lineWidth: 3,
              });
              drawing.drawLandmarks(lm, { color: "#ff1744", radius: 3 });

              const r = countFingers(lm);
              if (r.count !== lastCount) {
                lastCount = r.count;
                setResult(r);
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
        <ul className="fingers">
          {FINGER_NAMES.map((name, i) => (
            <li key={name} className={result.fingers[i] ? "up" : ""}>
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="status">{status}</p>
      )}
    </main>
  );
}
