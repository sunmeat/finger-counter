import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import PianoScreen from "../components/PianoScreen.jsx";
import SettingsScreen from "../components/SettingsScreen.jsx";
import TrainerScreen from "../components/TrainerScreen.jsx";
import { usePianoApp } from "../hooks/usePianoApp.js";
import "../styles/global.css";

export default function App() {
    const app = usePianoApp();
    const [activeSection, setActiveSection] = useState("piano");
    const keepPianoMounted = activeSection !== "piano";

    const openPiano = () => setActiveSection("piano");
    const openLearn = () => setActiveSection("learn");
    const openSettings = () => setActiveSection("settings");

    return (
        <>
            <div className={keepPianoMounted ? "piano-screen-hidden" : ""} aria-hidden={keepPianoMounted}>
                <PianoScreen
                    {...app}
                    activeSection="piano"
                    onOpenPiano={openPiano}
                    onOpenTrainer={openLearn}
                    onOpenSettings={openSettings}
                />
            </div>
            {activeSection === "settings" && (
                <SettingsScreen
                    {...app}
                    onBack={openPiano}
                    onOpenPiano={openPiano}
                    onOpenTrainer={openLearn}
                    onOpenSettings={openSettings}
                />
            )}
            {activeSection === "learn" && (
                <TrainerScreen
                    {...app}
                    activeSection="learn"
                    onOpenPiano={openPiano}
                    onOpenTrainer={openLearn}
                    onOpenSettings={openSettings}
                />
            )}
            <Analytics />
        </>
    );
}
