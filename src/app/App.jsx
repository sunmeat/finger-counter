import { useCallback, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import PianoScreen from "../components/PianoScreen.jsx";
import SettingsScreen from "../components/SettingsScreen.jsx";
import TrainerScreen from "../components/TrainerScreen.jsx";
import { usePianoApp } from "../hooks/usePianoApp.js";
import "../styles/global.css";

function sectionFromPath(pathname) {
    if (pathname.replace(/\/+$/, "") === "/settings") return "settings";
    if (pathname.replace(/\/+$/, "") === "/learn") return "learn";
    return "piano";
}

function pathForSection(section) {
    if (section === "settings") return "/settings";
    if (section === "learn") return "/learn";
    return "/";
}

export default function App() {
    const app = usePianoApp();
    const [activeSection, setActiveSection] = useState(() => sectionFromPath(window.location.pathname));

    const navigate = useCallback((section) => {
        const path = pathForSection(section);
        if (window.location.pathname !== path) window.history.pushState({ section }, "", path);
        setActiveSection(section);
        window.scrollTo({ top: 0, behavior: "auto" });
    }, []);

    useEffect(() => {
        const handlePopState = () => setActiveSection(sectionFromPath(window.location.pathname));
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const keepPianoMounted = activeSection !== "piano";

    return (
        <>
            <div className={keepPianoMounted ? "piano-screen-hidden" : ""} aria-hidden={keepPianoMounted}>
                <PianoScreen
                    {...app}
                    activeSection="piano"
                    onOpenPiano={() => navigate("piano")}
                    onOpenTrainer={() => navigate("learn")}
                    onOpenSettings={() => navigate("settings")}
                />
            </div>
            {activeSection === "settings" && (
                <SettingsScreen
                    {...app}
                    activeSection="settings"
                    onBack={() => navigate("piano")}
                    onOpenPiano={() => navigate("piano")}
                    onOpenTrainer={() => navigate("learn")}
                    onOpenSettings={() => navigate("settings")}
                />
            )}
            {activeSection === "learn" && (
                <TrainerScreen
                    {...app}
                    activeSection="learn"
                    onOpenPiano={() => navigate("piano")}
                    onOpenTrainer={() => navigate("learn")}
                    onOpenSettings={() => navigate("settings")}
                />
            )}
            <Analytics />
        </>
    );
}
