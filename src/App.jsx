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

    const enableSound = useCallback(async () => {
        if (playerRef.current.ready) {
            setSoundOn(true);
            return;
        }

        try {
            await playerRef.current.start();
            setSoundOn(true);
        } catch (error) {
            console.error("Не удалось включить звук:", error);
        }
    }, []);

    useEffect(() => {
        const unlockAudio = () => {
            void enableSound();
        };

        /*
         * Любое реальное действие пользователя по странице
         * может разблокировать Web Audio API.
         *
         * mousemove специально не используем: браузеры не
         * считают простое движение мыши надёжным user gesture.
         */
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
    }, [enableSound]);

    const pickInstrument = (value) => {
        playerRef.current.setInstrument(value);
        setInstrument(value);
    };

    const playKeyboardNote = async (midi) => {
        if (!playerRef.current.ready) {
            await playerRef.current.start();
            setSoundOn(true);
        }

        playerRef.current.playKeyboardNote(midi);
    };

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
            onEnableSound={enableSound}
            instrument={instrument}
            onPickInstrument={pickInstrument}
            dominant={dominant}
            onPickDominant={setDominant}
            onPlayKeyboardNote={playKeyboardNote}
        />
    );
}
