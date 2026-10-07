import { useCallback, useEffect, useRef, useState } from "react";
import { Player } from "./piano.js";
import useHandTracking from "./useHandTracking.js";
import PianoScreen from "./components/PianoScreen.jsx";

export default function App() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const playerRef = useRef(null);

    if (!playerRef.current) {
        playerRef.current = new Player();
    }

    const [status, setStatus] = useState("Загрузка модели…");
    const [result, setResult] = useState(null);
    const [soundOn, setSoundOn] = useState(false);
    const [instrument, setInstrument] = useState("piano");
    const [dominant, setDominant] = useState("right");

    const onResult = useCallback((value) => setResult(value), []);
    const onStatus = useCallback((value) => setStatus(value), []);

    const toggleSound = useCallback(async () => {
        if (soundOn) {
            playerRef.current.releaseAll();
            playerRef.current.releaseKeyboardNotes();
            setSoundOn(false);
            return;
        }

        try {
            await playerRef.current.start();
            setSoundOn(true);
        } catch (error) {
            console.error("Не удалось включить звук:", error);
        }
    }, [soundOn]);

    useEffect(() => {
        const unlockAudio = () => {
            if (!playerRef.current.ready) {
                void playerRef.current.start();
            }
        };

        window.addEventListener("pointerdown", unlockAudio, {
            capture: true,
            once: true,
        });

        window.addEventListener("keydown", unlockAudio, {
            capture: true,
            once: true,
        });

        return () => {
            window.removeEventListener("pointerdown", unlockAudio, true);
            window.removeEventListener("keydown", unlockAudio, true);
        };
    }, []);

    const pickInstrument = (value) => {
        playerRef.current.setInstrument(value);
        setInstrument(value);
    };

    const playKeyboardNote = async (midi) => {
        if (!soundOn) {
            return;
        }

        if (!playerRef.current.ready) {
            await playerRef.current.start();
        }

        playerRef.current.playKeyboardNote(midi);
    };

    const releaseKeyboardNote = (midi) => {
        playerRef.current.releaseKeyboardNote(midi);
    };

    useEffect(() => {
        const computerKeys = {
            a: 69,
            w: 70,
            s: 71,
            d: 72,
            r: 73,
            f: 74,
            t: 75,
            g: 76,
            h: 77,
            u: 78,
            j: 79,
            i: 80,
        };

        const pressed = new Set();

        const onKeyDown = async (event) => {
            const target = event.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target?.isContentEditable
            ) {
                return;
            }

            const midi = computerKeys[event.key.toLowerCase()];
            if (midi == null || pressed.has(event.key.toLowerCase())) {
                return;
            }

            event.preventDefault();
            pressed.add(event.key.toLowerCase());

            if (!soundOn) {
                return;
            }

            await playKeyboardNote(midi);
        };

        const onKeyUp = (event) => {
            const key = event.key.toLowerCase();
            const midi = computerKeys[key];
            if (midi == null) {
                return;
            }

            pressed.delete(key);
            releaseKeyboardNote(midi);
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            pressed.clear();
        };
    }, [soundOn]);

    useHandTracking({
        videoRef,
        canvasRef,
        dominant,
        player: playerRef.current,
        onResult,
        onStatus,
    });

    return (
        <PianoScreen
            videoRef={videoRef}
            canvasRef={canvasRef}
            result={result}
            status={status}
            soundOn={soundOn}
            onEnableSound={toggleSound}
            instrument={instrument}
            onPickInstrument={pickInstrument}
            dominant={dominant}
            onPickDominant={setDominant}
            onPlayKeyboardNote={playKeyboardNote}
            onReleaseKeyboardNote={releaseKeyboardNote}
        />
    );
}
