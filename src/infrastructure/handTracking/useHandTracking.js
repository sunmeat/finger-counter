import { useEffect, useRef } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { countFingers } from "./domain/fingerCounter.js";
import { planSound } from "./domain/piano.js";
import { MODEL_URL, STABLE_FRAMES, SWAP_HANDS, WASM_URL } from "./domain/constants.js";
import { fixSides, rolesFor, sideFromLabel } from "./domain/handRoles.js";

function drawHand(drawing, landmarks, color, ink) {
    drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
        color,
        lineWidth: 3,
    });

    drawing.drawLandmarks(landmarks, {
        color: ink,
        fillColor: color,
        lineWidth: 1.5,
        radius: 4,
    });
}

export default function useHandTracking({
    videoRef,
    canvasRef,
    dominant,
    player,
    onResult,
    onStatus,
}) {
    const dominantRef = useRef(dominant);

    useEffect(() => {
        dominantRef.current = dominant;
    }, [dominant]);

    useEffect(() => {
        let landmarker;
        let stream;
        let rafId;
        let cancelled = false;
        let lastVideoTime = -1;
        let lastUiKey = null;
        let pendingKey = null;
        let pendingFrames = 0;
        let playingKey = "";

        function updateSound(plan) {
            if (plan.key === pendingKey) {
                pendingFrames++;
            } else {
                pendingKey = plan.key;
                pendingFrames = 1;
            }

            if (pendingFrames >= STABLE_FRAMES) {
                const changed = plan.key !== playingKey;

                if (changed) {
                    playingKey = plan.key;
                    player.releaseAll();

                    if (plan.key) {
                        player.playNotes(plan.midi);
                    }
                }
            }
        }

        async function init() {
            try {
                const vision = await FilesetResolver.forVisionTasks(WASM_URL);

                landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: MODEL_URL,
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });

                onStatus("Запрашиваю доступ к камере…");

                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: "user" },
                    audio: false,
                });

                if (cancelled) return;

                const video = videoRef.current;
                video.srcObject = stream;
                await video.play();

                onStatus("Покажите руки в камеру");

                const canvas = canvasRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext("2d");
                const drawing = new DrawingUtils(ctx);
                const css = getComputedStyle(document.documentElement);
                const cssVar = (name, fallback) =>
                    css.getPropertyValue(name).trim() || fallback;

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
                                side: sideFromLabel(
                                    handedness[i]?.[0]?.categoryName,
                                    SWAP_HANDS
                                ),
                                wristX: lm[0].x,
                            }));

                            fixSides(hands);

                            const { noteSide, chordSide } = rolesFor(dominantRef.current);

                            hands.forEach((h, i) => {
                                const color =
                                    h.side === noteSide
                                        ? colors.note
                                        : h.side === chordSide
                                            ? colors.chord
                                            : colors.neutral;

                                drawHand(drawing, res.landmarks[i], color, colors.ink);
                            });

                            const noteHand = hands.find((h) => h.side === noteSide);
                            const chordHand = hands.find((h) => h.side === chordSide);
                            const plan = planSound(noteHand?.fingers, chordHand?.fingers);

                            updateSound(plan);

                            const uiKey =
                                dominant +
                                "|" +
                                hands
                                    .map((h) => h.side + h.fingers.map(Number).join(""))
                                    .join("|");

                            if (uiKey !== lastUiKey) {
                                lastUiKey = uiKey;
                                onResult({
                                    count: hands.reduce((sum, h) => sum + h.count, 0),
                                    hands,
                                    chord: plan.label,
                                    midi: plan.midi,
                                    roots: plan.roots,
                                });
                            }
                        } else {
                            updateSound({
                                key: "",
                                midi: [],
                                roots: [],
                                label: "",
                            });

                            if (lastUiKey !== null) {
                                lastUiKey = null;
                                onResult(null);
                            }
                        }
                    }

                    rafId = requestAnimationFrame(loop);
                };

                loop();
            } catch (e) {
                console.error(e);
                onStatus(`Ошибка: ${e.message || e}`);
            }
        }

        init();

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            stream?.getTracks().forEach((track) => track.stop());
            landmarker?.close();
            player.releaseAll();
        };
    }, [videoRef, canvasRef, player, onResult, onStatus]);
}
