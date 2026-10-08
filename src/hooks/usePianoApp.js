import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "../infrastructure/audio/Player.js";
import useHandTracking from "../infrastructure/handTracking/useHandTracking.js";
import { useKeyboardPiano } from "./useKeyboardPiano.js";

export function usePianoApp() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const playerRef = useRef(null);

    if (!playerRef.current) playerRef.current = new Player();

    const [status, setStatus] = useState("Загрузка модели…");
    const [result, setResult] = useState(null);
    const [soundOn, setSoundOn] = useState(false);
    const [instrument, setInstrument] = useState("piano");
    const [dominant, setDominant] = useState("right");

    const onResult = useCallback((value) => setResult(value), []);
    const onStatus = useCallback((value) => setStatus(value), []);

    const enableSound = useCallback(async () => {
        try {
            await playerRef.current.start();
            setSoundOn(true);
        } catch (error) {
            console.error("Не удалось включить звук:", error);
        }
    }, []);

    useEffect(() => {
        const unlockAudio = () => {
            if (!playerRef.current.ready) void playerRef.current.start();
        };
        window.addEventListener("pointerdown", unlockAudio, { capture: true, once: true });
        window.addEventListener("keydown", unlockAudio, { capture: true, once: true });

        return () => {
            window.removeEventListener("pointerdown", unlockAudio, true);
            window.removeEventListener("keydown", unlockAudio, true);
        };
    }, []);

    const pickInstrument = useCallback((value) => {
        playerRef.current.setInstrument(value);
        setInstrument(value);
    }, []);

    const playKeyboardNote = useCallback(async (midi) => {
        if (!soundOn) return;
        if (!playerRef.current.ready) await playerRef.current.start();
        playerRef.current.playKeyboardNote(midi);
    }, [soundOn]);

    const releaseKeyboardNote = useCallback((midi) => {
        playerRef.current.releaseKeyboardNote(midi);
    }, []);

    const keyboardMidi = useKeyboardPiano({
        soundOn,
        onPlayNote: playKeyboardNote,
        onReleaseNote: releaseKeyboardNote,
    });

    useHandTracking({
        videoRef,
        canvasRef,
        dominant,
        player: playerRef.current,
        onResult,
        onStatus,
    });

    return {
        videoRef, canvasRef, result, status, soundOn,
        onEnableSound: enableSound,
        instrument, onPickInstrument: pickInstrument,
        dominant, onPickDominant: setDominant,
        keyboardMidi, onPlayKeyboardNote: playKeyboardNote,
        onReleaseKeyboardNote: releaseKeyboardNote,
    };
}
