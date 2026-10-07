import { useCallback, useRef, useState } from "react";
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

    const enableSound = async () => {
        await playerRef.current.start();
        setSoundOn(true);
    };

    const pickInstrument = (value) => {
        playerRef.current.setInstrument(value);
        setInstrument(value);
    };

    const playKeyboardNote = async (midi) => {
        if (!playerRef.current.ready) {
            await playerRef.current.start();
            setSoundOn(true);
        }

        playerRef.current.playNotes([midi]);
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
