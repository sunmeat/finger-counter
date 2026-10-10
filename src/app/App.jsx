import { Analytics } from "@vercel/analytics/react";
import PianoScreen from "../components/PianoScreen.jsx";
import SettingsScreen from "../components/SettingsScreen.jsx";
import { usePianoApp } from "../hooks/usePianoApp.js";
import "../styles/global.css";

export default function App() {
    const app = usePianoApp();
    return (
        <>
            {app.settingsOpen
                ? <SettingsScreen
                    dominant={app.dominant}
                    onPickDominant={app.onPickDominant}
                    gestures={app.gestures}
                    onSaveGestures={app.onSaveGestures}
                    onBack={app.onCloseSettings}
                />
                : <PianoScreen {...app} />}
            <Analytics />
        </>
    );
}
