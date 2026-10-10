import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "../infrastructure/audio/Player.js";
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
        retryToken, cameraFacing, gestures, onGestureAction,
    });

    return {
        videoRef, canvasRef, result, status, soundOn, cameraFacing, onToggleCamera,
        onEnableSound: enableSound, instrument, onPickInstrument: pickInstrument,
        dominant, onPickDominant: setDominant, gestures, onSaveGestures: saveGestures,
        settingsOpen, onOpenSettings: () => setSettingsOpen(true), onCloseSettings: () => setSettingsOpen(false),
        keyboardMidi, onPlayKeyboardNote: playKeyboardNote, onPlayPreview: playPreview,
        onReleaseKeyboardNote: releaseKeyboardNote, onRetry,
    };
}
