import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import PianoScreen from "../components/PianoScreen.jsx";
import SettingsScreen from "../components/SettingsScreen.jsx";
import TrainerScreen from "../components/TrainerScreen.jsx";
import { usePianoApp } from "../hooks/usePianoApp.js";
import "../styles/global.css";

export default function App() {
    const app = usePianoApp();
    const [trainerOpen, setTrainerOpen] = useState(false);
    const keepPianoMounted = app.settingsOpen || trainerOpen;

    return (
        <>
            <div className={keepPianoMounted ? "piano-screen-hidden" : ""} aria-hidden={keepPianoMounted}>
                <PianoScreen {...app} onOpenTrainer={() => setTrainerOpen(true)} />
            </div>
            {app.settingsOpen && (
                <SettingsScreen
                    dominant={app.dominant}
                    onPickDominant={app.onPickDominant}
                    gestures={app.gestures}
                    onSaveGestures={app.onSaveGestures}
                    onBack={app.onCloseSettings}
                />
            )}
            {!app.settingsOpen && trainerOpen && (
                <TrainerScreen
                    {...app}
                    onCloseTrainer={() => setTrainerOpen(false)}
                />
            )}
            <Analytics />
        </>
    );
}
