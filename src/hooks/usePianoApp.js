import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "../infrastructure/audio/Player.js";
import { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import { rolesFor } from "../domain/handRoles.js";
import useHandTracking from "../infrastructure/handTracking/useHandTracking.js";
import { useKeyboardPiano } from "./useKeyboardPiano.js";

const SETTINGS_KEY = "aerodion.settings.v1";

function readSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        return {
            dominant: saved.dominant === "left" ? "left" : "right",
            gestures: Array.isArray(saved.gestures) ? saved.gestures : [],
        };
    } catch {
        return { dominant: "right", gestures: [] };
    }
}

export function usePianoApp() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const trainerCanvasRef = useRef(null);
    const trainerDrawingRef = useRef(null);
    const trainerColorsRef = useRef(null);
    const playerRef = useRef(null);
    if (!playerRef.current) playerRef.current = new Player();

    const [status, setStatus] = useState("Загрузка модели…");
    const [result, setResult] = useState(null);
    const [soundOn, setSoundOn] = useState(false);
    const [instrument, setInstrument] = useState("piano");
    const [initialSettings] = useState(readSettings);
    const [dominant, setDominant] = useState(initialSettings.dominant);
    const [gestures, setGestures] = useState(initialSettings.gestures);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [retryToken, setRetryToken] = useState(0);
    const [cameraFacing, setCameraFacing] = useState("user");

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ dominant, gestures }));
        } catch (error) {
            console.warn("Не удалось сохранить настройки:", error);
        }
    }, [dominant, gestures]);

    const onResult = useCallback((value) => setResult(value), []);
    const onHandFrame = useCallback((hands) => {
        const canvas = trainerCanvasRef.current;
        if (!canvas) return;
        const video = videoRef.current;
        const width = video?.videoWidth || 640;
        const height = video?.videoHeight || 480;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (!trainerDrawingRef.current || trainerDrawingRef.current.ctx !== ctx) {
            trainerDrawingRef.current = { ctx, drawing: new DrawingUtils(ctx) };
        }
        if (!trainerColorsRef.current) {
            const styles = getComputedStyle(document.documentElement);
            const cssVar = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
            trainerColorsRef.current = {
                note: cssVar("--note", "#f0b44c"), chord: cssVar("--chord", "#62cbd9"),
                neutral: cssVar("--ivory", "#f1ecdf"), ink: cssVar("--ink", "#101a23"),
            };
        }
        ctx.clearRect(0, 0, width, height);
        if (!hands?.length) return;
        const { noteSide, chordSide } = rolesFor(dominant);
        const colors = trainerColorsRef.current;
        const drawing = trainerDrawingRef.current.drawing;
        hands.forEach(({ landmarks, side }) => {
            if (!landmarks) return;
            const color = side === noteSide ? colors.note : side === chordSide ? colors.chord : colors.neutral;
            drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color, lineWidth: 3 });
            drawing.drawLandmarks(landmarks, { color: colors.ink, fillColor: color, lineWidth: 1.5, radius: 4 });
        });
    }, [dominant]);
    const onStatus = useCallback((value) => setStatus(value), []);
    const onRetry = useCallback(() => {
        setResult(null);
        setStatus("Повторная инициализация…");
        setRetryToken((value) => value + 1);
    }, []);
    const onToggleCamera = useCallback(() => {
        setResult(null);
        setStatus("Переключаю камеру…");
        setCameraFacing((current) => current === "user" ? "environment" : "user");
    }, []);

    const enableSound = useCallback(async () => {
        try {
            await playerRef.current.start();
            setSoundOn(true);
        } catch (error) {
            console.error("Не удалось включить звук:", error);
        }
    }, []);

    useEffect(() => {
        const handleFirstClick = () => { void enableSound(); };
        window.addEventListener("pointerdown", handleFirstClick, { capture: true, once: true });
        return () => window.removeEventListener("pointerdown", handleFirstClick, true);
    }, [enableSound]);

    const pickInstrument = useCallback((value) => {
        playerRef.current.setInstrument(value);
        setInstrument(value);
    }, []);

    const onGestureAction = useCallback((action) => {
        if (action?.type === "instrument") pickInstrument(action.target);
    }, [pickInstrument]);

    const playKeyboardNote = useCallback(async (midi) => {
        if (!soundOn) return;
        if (!playerRef.current.ready) await playerRef.current.start();
        playerRef.current.playKeyboardNote(midi);
    }, [soundOn]);

    const playPreview = useCallback(async (midi) => {
        if (!soundOn || !midi.length) return;
        if (!playerRef.current.ready) await playerRef.current.start();
        playerRef.current.previewNotes(midi);
    }, [soundOn]);

    const releaseKeyboardNote = useCallback((midi) => playerRef.current.releaseKeyboardNote(midi), []);
    const saveGestures = useCallback((value) => setGestures(value), []);
    const keyboardMidi = useKeyboardPiano({ soundOn, onPlayNote: playKeyboardNote, onReleaseNote: releaseKeyboardNote });

    useHandTracking({
        videoRef, canvasRef, dominant, player: playerRef.current, onResult, onStatus,
        retryToken, cameraFacing, gestures, onGestureAction, onHandFrame,
    });

    return {
        videoRef, canvasRef, trainerCanvasRef, result, status, soundOn, cameraFacing, onToggleCamera,
        onEnableSound: enableSound, instrument, onPickInstrument: pickInstrument,
        dominant, onPickDominant: setDominant, gestures, onSaveGestures: saveGestures,
        settingsOpen, onOpenSettings: () => setSettingsOpen(true), onCloseSettings: () => setSettingsOpen(false),
        keyboardMidi, onPlayKeyboardNote: playKeyboardNote, onPlayPreview: playPreview,
        onReleaseKeyboardNote: releaseKeyboardNote, onRetry,
    };
}
