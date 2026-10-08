import { Analytics } from "@vercel/analytics/react";
import PianoScreen from "../components/PianoScreen.jsx";
import { usePianoApp } from "../hooks/usePianoApp.js";
import "../styles/global.css";

export default function App() {
    const app = usePianoApp();
    return (
        <>
            <PianoScreen {...app} />
            <Analytics />
        </>
    );
}
