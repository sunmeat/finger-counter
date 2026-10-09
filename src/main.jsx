import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
            console.warn("Не удалось зарегистрировать service worker:", error);
        });
    });
}
