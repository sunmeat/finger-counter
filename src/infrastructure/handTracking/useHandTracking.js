import { useEffect, useRef } from "react";
import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import { countFingers } from "../../domain/fingerCounter.js";
import { planSound } from "../../domain/piano.js";
import { MODEL_URL, STABLE_FRAMES, SWAP_HANDS, WASM_URL } from "../../domain/constants.js";

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

function sideFromLabel(label, swapHands = false) {
    if (label !== "Left" && label !== "Right") {
        return null;
    }

    const isRight = (label === "Right") !== swapHands;
    return isRight ? "right" : "left";
}

function fixSides(hands) {
    if (hands.length === 2 && hands[0].side === hands[1].side) {
        const rightIdx = hands[0].wristX < hands[1].wristX ? 0 : 1;
        hands[rightIdx].side = "right";
        hands[1 - rightIdx].side = "left";
    }
}

function rolesFor(dominant) {
    const noteSide = dominant === "right" ? "left" : "right";
    const chordSide = noteSide === "left" ? "right" : "left";

    return { noteSide, chordSide };
}

export default function useHandTracking({
    videoRef,
    canvasRef,
    dominant,
    player,
    onResult,
    onStatus,
    retryToken,
    cameraFacing = "user",
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

        const handHistory = new Map();
        const HISTORY_SIZE = 6;
        const STABLE_FRAMES = 4;

        function stopStream() {
            stream?.getTracks().forEach((track) => track.stop());
            stream = undefined;
        }

        function closeLandmarker() {
            landmarker?.close();
            landmarker = undefined;
        }

        function cleanupResources() {
            cancelAnimationFrame(rafId);

            const video = videoRef.current;
            if (video) {
                video.pause();
                video.srcObject = null;
            }

            stopStream();
            closeLandmarker();
            player.releaseAll();
        }

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

        function smoothHand(side, fingers) {
            if (!side) return fingers;

            const history = handHistory.get(side) ?? [];
            history.push(fingers.map(Boolean));

            if (history.length > HISTORY_SIZE) {
                history.shift();
            }

            handHistory.set(side, history);

            return fingers.map((_, index) => {
                const ones = history.filter((frame) => frame[index]).length;
                return ones >= Math.ceil(history.length / 2);
            });
        }

        function resetHandHistory() {
            handHistory.clear();
        }

        async function createLandmarker(vision) {
            try {
                return await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: MODEL_URL,
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });
            } catch (gpuError) {
                if (cancelled) return null;

                console.warn("GPU недоступен, переключаюсь на CPU:", gpuError);

                return HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: MODEL_URL,
                        delegate: "CPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });
            }
        }

        async function init() {
            try {
                const vision = await FilesetResolver.forVisionTasks(WASM_URL);

                if (cancelled) return;

                landmarker = await createLandmarker(vision);

                if (cancelled) {
                    closeLandmarker();
                    return;
                }

                if (!landmarker) return;

                onStatus("Запрашиваю доступ к камере…");

                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, facingMode: { ideal: cameraFacing } },
                    audio: false,
                });

                if (cancelled) {
                    stopStream();
                    closeLandmarker();
                    return;
                }

                const video = videoRef.current;
                video.srcObject = stream;
                await video.play();

                if (cancelled) {
                    stopStream();
                    closeLandmarker();
                    video.srcObject = null;
                    return;
                }

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
                            const handedness = res.handedness ?? [];
                            const worldLandmarks = res.worldLandmarks ?? [];

                            const hands = res.landmarks.map((lm, i) => ({
                                ...countFingers(worldLandmarks[i] ?? lm),
                                side: sideFromLabel(
                                    handedness[i]?.[0]?.categoryName,
                                    SWAP_HANDS
                                ),
                                wristX: lm[0].x,
                            }));

                            fixSides(hands);

                            const activeSides = new Set(hands.map((hand) => hand.side));
                            for (const side of handHistory.keys()) {
                                if (!activeSides.has(side)) {
                                    handHistory.delete(side);
                                }
                            }

                            const { noteSide, chordSide } = rolesFor(dominantRef.current);

                            const smoothedHands = hands.map((hand) => ({
                                ...hand,
                                fingers: smoothHand(hand.side, hand.fingers),
                            })).map((hand) => ({
                                ...hand,
                                count: hand.fingers.filter(Boolean).length,
                            }));

                            smoothedHands.forEach((h, i) => {
                                const color =
                                    h.side === noteSide
                                        ? colors.note
                                        : h.side === chordSide
                                            ? colors.chord
                                            : colors.neutral;

                                drawHand(drawing, res.landmarks[i], color, colors.ink);
                            });

                            const noteHand = smoothedHands.find((h) => h.side === noteSide);
                            const chordHand = smoothedHands.find((h) => h.side === chordSide);
                            const plan = planSound(noteHand?.fingers, chordHand?.fingers);

                            updateSound(plan);

                            const uiKey =
                                dominantRef.current +
                                "|" +
                                smoothedHands
                                    .map((h) => h.side + h.fingers.map(Number).join(""))
                                    .sort()
                                    .join("|");

                            if (uiKey !== lastUiKey) {
                                lastUiKey = uiKey;
                                onResult({
                                    count: smoothedHands.reduce((sum, h) => sum + h.count, 0),
                                    hands: smoothedHands,
                                    chord: plan.label,
                                    midi: plan.midi,
                                    roots: plan.roots,
                                });
                            }
                        } else {
                            resetHandHistory();

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
                if (cancelled) return;

                console.error(e);

                if (e?.name === "NotAllowedError") {
                    onStatus("Доступ к камере запрещён. Разрешите камеру в настройках браузера и нажмите «Повторить».");
                } else if (e?.name === "NotFoundError") {
                    onStatus("Камера не найдена. Подключите камеру и нажмите «Повторить».");
                } else if (e?.name === "NotReadableError") {
                    onStatus("Камера занята другим приложением. Закройте его и нажмите «Повторить».");
                } else {
                    onStatus("Не удалось запустить камеру или модель. Нажмите «Повторить».");
                }
            }
        }

        init();

        return () => {
            cancelled = true;
            cleanupResources();
        };
    }, [videoRef, canvasRef, player, onResult, onStatus, retryToken, cameraFacing]);
}
