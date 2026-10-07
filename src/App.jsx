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
